import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import type { BaselineDiff } from './baseline.js';
import { calculateHealthScore } from './baseline.js';
import type { HealthFinding } from './health-analyzer.interface.js';
import type { ModuleTensionSummary } from './tension-clusterer.js';

export { calculateHealthScore };

const SEPARATOR = '─'.repeat(17);
const MIN_MODULE_WIDTH = 12;
const DETAIL_TITLE_WIDTH = 68;

export const PASSING_PLACEHOLDERS = [
  'Transaction boundary consistency',
  'Dependency inversion compliance',
  'Layer boundary enforcement',
];

export const TENSION_SUBTITLES: Record<string, string> = {
  'result-pattern-inconsistency': 'competing approaches detected',
  'validation-strategy-inconsistency': 'competing validation approaches detected',
  'persistence-bypass': 'Application layer files access DbContext directly',
  'cqrs-bypass': 'Application layer bypasses MediatR dispatch',
  'scan-warning': 'file read failures',
};

export interface HealthReportOptions {
  repoPath: string;
  repoName?: string;
  timestamp?: string;
  demoFooter?: boolean;
}

interface ParsedDetailSegment {
  label: string;
  percentage: number;
  dominant: boolean;
}

export function resolveRepoName(repoPath: string): string {
  const packageJsonPath = path.join(repoPath, 'package.json');

  try {
    const raw = fs.readFileSync(packageJsonPath, 'utf8');
    const parsed = JSON.parse(raw) as { name?: string };

    if (typeof parsed.name === 'string' && parsed.name.length > 0) {
      return parsed.name;
    }
  } catch {
    // Fall back to folder name.
  }

  return path.basename(repoPath);
}

function printSeparator(): void {
  console.log(chalk.dim(SEPARATOR));
}

export function tensionShortLabel(tensionType: string): string {
  const labels: Record<string, string> = {
    'result-pattern-inconsistency': 'result pattern',
    'validation-strategy-inconsistency': 'validation',
    'persistence-bypass': 'persistence bypass',
    'cqrs-bypass': 'CQRS bypass',
    'scan-warning': 'file read failures',
  };

  return labels[tensionType] ?? tensionType.replace(/-/g, ' ');
}

function colorizeSeverityIcon(severity: string): string {
  if (severity === 'critical') {
    return chalk.red('●');
  }

  if (severity === 'warning') {
    return chalk.yellow('◐');
  }

  return chalk.green('✓');
}

function formatSeverityBadge(severity: HealthFinding['severity'], isNew: boolean): string {
  const label = severity === 'critical' ? '[CRITICAL]' : '[WARNING]';
  const severityBadge =
    severity === 'critical' ? chalk.red.bold(label) : chalk.yellow.bold(label);
  const newBadge = isNew ? chalk.cyan(' [NEW]') : '';

  return `${severityBadge}${newBadge}`;
}

export function formatBaselineDeltaPlain(diff: BaselineDiff | null): string {
  if (diff === null) {
    return '';
  }

  if (diff.scoreDelta === 0) {
    return 'no change since last scan';
  }

  if (diff.scoreDelta < 0) {
    return `↓${Math.abs(diff.scoreDelta)} since last scan`;
  }

  return `↑${diff.scoreDelta} since last scan`;
}

function formatBaselineDelta(diff: BaselineDiff | null): string {
  const plain = formatBaselineDeltaPlain(diff);

  if (plain === '') {
    return '';
  }

  if (diff?.scoreDelta === 0) {
    return chalk.dim(`  ${plain}`);
  }

  if (diff !== null && diff.scoreDelta < 0) {
    return chalk.red(`  ${plain}`);
  }

  return chalk.green(`  ${plain}`);
}

export function parseDetailSegments(detail: string): ParsedDetailSegment[] | null {
  if (!detail.includes('%')) {
    return null;
  }

  const segments = detail.split(',').map((segment) => segment.trim());
  const parsed: ParsedDetailSegment[] = [];

  for (const segment of segments) {
    const match = segment.match(/^(.+?):\s*\d+\s*\((\d+)%([^)]*)\)/);

    if (match === null) {
      continue;
    }

    parsed.push({
      label: match[1].trim(),
      percentage: Number.parseInt(match[2], 10),
      dominant: match[3].includes('dominant'),
    });
  }

  return parsed.length > 0 ? parsed : null;
}

function formatFindingSubtitle(finding: HealthFinding, parsedSegments: ParsedDetailSegment[] | null): string {
  if (parsedSegments !== null) {
    return `${parsedSegments.length} competing approaches detected`;
  }

  return TENSION_SUBTITLES[finding.tensionType] ?? finding.detail;
}

function formatFindingDetailLines(finding: HealthFinding): string[] {
  const parsedSegments = parseDetailSegments(finding.detail);
  const lines: string[] = [];

  if (parsedSegments !== null) {
    for (const segment of parsedSegments) {
      const suffix = segment.dominant ? '  (dominant)' : '  ← non-dominant';
      lines.push(`· ${segment.label.padEnd(16)}${String(segment.percentage).padStart(3)}%${suffix}`);
    }
  } else {
    lines.push(finding.detail);
  }

  lines.push('');
  lines.push(`Modules: ${finding.module}`);

  if (finding.affectedFiles !== undefined && finding.affectedFiles.length > 0) {
    lines.push(chalk.dim('Affected files:'));
    for (const file of finding.affectedFiles) {
      lines.push(chalk.dim(`  ${file}`));
    }
  }

  return lines;
}

function formatTopDriftRow(cluster: ModuleTensionSummary, moduleWidth: number): string {
  const badges = cluster.tensions
    .map((tension) => {
      const icon = colorizeSeverityIcon(tension.severity);
      return `${icon} ${tensionShortLabel(tension.type)}`;
    })
    .join('  ');

  const moduleColumn = cluster.module.padEnd(moduleWidth);
  const countLabel = `${cluster.tensionCount} tension${cluster.tensionCount === 1 ? '' : 's'}`;

  return `${moduleColumn}${badges}    ${countLabel}`;
}

function printTopDriftSources(clusters: ModuleTensionSummary[], diff: BaselineDiff | null): void {
  console.log('Top Drift Sources');
  console.log('');

  if (diff !== null && diff.worseningModules.length > 0) {
    console.log(chalk.dim(`Worsening modules: ${diff.worseningModules.join(', ')}`));
    console.log('');
  }

  printSeparator();
  console.log('');

  const moduleWidth = Math.max(MIN_MODULE_WIDTH, ...clusters.map((cluster) => cluster.module.length));

  for (const cluster of clusters) {
    console.log(formatTopDriftRow(cluster, moduleWidth));
  }

  console.log('');
  printSeparator();
  console.log('');
}

function printTensionsDetail(findings: HealthFinding[], newTensionTypes: Set<string>): void {
  console.log('Tensions Detail');
  console.log('');
  printSeparator();
  console.log('');

  const grouped = new Map<string, HealthFinding[]>();

  for (const finding of findings) {
    const group = grouped.get(finding.tensionType) ?? [];
    group.push(finding);
    grouped.set(finding.tensionType, group);
  }

  const sortedGroups = [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  for (const [, groupFindings] of sortedGroups) {
    const sortedFindings = [...groupFindings].sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity === 'critical' ? -1 : 1;
      }

      return a.title.localeCompare(b.title);
    });

    for (const finding of sortedFindings) {
      const icon = colorizeSeverityIcon(finding.severity);
      const isNew = newTensionTypes.has(finding.tensionType);
      const badge = formatSeverityBadge(finding.severity, isNew);
      const title = finding.title;
      const padding = Math.max(1, DETAIL_TITLE_WIDTH - title.length);
      const parsedSegments = parseDetailSegments(finding.detail);

      console.log(`${icon} ${title}${' '.repeat(padding)}${badge}`);
      console.log('');
      console.log(formatFindingSubtitle(finding, parsedSegments));
      console.log('');

      for (const line of formatFindingDetailLines(finding)) {
        console.log(line);
      }

      console.log('');
    }
  }

  printSeparator();
  console.log('');
}

function printPassingSection(): void {
  console.log('Passing');
  console.log('');
  printSeparator();
  console.log('');

  for (const label of PASSING_PLACEHOLDERS) {
    console.log(`${chalk.green('✓')} ${label}`);
  }

  console.log('');
  printSeparator();
  console.log('');
}

function printHealthScoreLine(findings: HealthFinding[], diff: BaselineDiff | null): void {
  const score = calculateHealthScore(findings);
  const delta = formatBaselineDelta(diff);

  console.log(`Health Score: ${chalk.bold(String(score))}/100${delta}`);
  console.log('');
  printSeparator();
}

function printDemoFooter(): void {
  console.log(chalk.dim('This is a demo using eShopOnWeb snapshot data.'));
  console.log(chalk.dim('Run against your repo: pr-sanity health --path /path/to/your/repo'));
}

export function printHealthReport(
  findings: HealthFinding[],
  clusters: ModuleTensionSummary[],
  diff: BaselineDiff | null,
  options: HealthReportOptions,
): void {
  const repoName = options.repoName ?? resolveRepoName(options.repoPath);
  const timestamp =
    options.timestamp ?? new Date().toISOString().replace('T', ' ').slice(0, 19);
  const newTensionTypes = new Set(diff?.newTensions.map((finding) => finding.tensionType) ?? []);

  console.log('');
  console.log(chalk.bold(`Architecture Drift Report · ${repoName}`));
  console.log('');
  console.log(chalk.dim(timestamp));
  console.log('');

  if (findings.length === 0) {
    console.log(chalk.green('No architectural tensions detected'));
    console.log('');
  } else {
    const moduleCount = clusters.length;
    console.log(
      `${findings.length} tension${findings.length === 1 ? '' : 's'} detected across ${moduleCount} module${moduleCount === 1 ? '' : 's'}`,
    );
    console.log('');
    printTopDriftSources(clusters, diff);
    printTensionsDetail(findings, newTensionTypes);
  }

  printPassingSection();
  printHealthScoreLine(findings, diff);

  if (findings.some((finding) => finding.severity === 'critical')) {
    console.log(chalk.red('Run pr-sanity drift to see how long these tensions have been present.'));
  }

  if (options.demoFooter) {
    console.log('');
    printDemoFooter();
  }

  console.log('');
}
