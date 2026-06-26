import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import type { BaselineSnapshot } from './baseline.js';
import type { HealthFinding } from './health-analyzer.interface.js';

const BAR_WIDTH = 36;
const SEPARATOR = '─'.repeat(36);
const SCORE_LABEL_WIDTH = 3;

const TENSION_TITLES: Record<string, string> = {
  'result-pattern-inconsistency': 'Result pattern inconsistency',
  'validation-strategy-inconsistency': 'Validation strategy inconsistency',
  'persistence-bypass': 'Persistence bypass',
  'cqrs-bypass': 'CQRS bypass',
};

type TrendBadge = 'GROWING' | 'STABLE' | 'NEW';

export interface DriftReportOptions {
  repoPath: string;
  last: number;
}

interface TensionTrendRow {
  tensionType: string;
  label: string;
  scanCount: number;
  badge: TrendBadge;
}

function resolveRepoName(repoPath: string): string {
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

function formatSnapshotDate(savedAt: string): string {
  return new Date(savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function tensionTitle(tensionType: string): string {
  return TENSION_TITLES[tensionType] ?? tensionType.replace(/-/g, ' ');
}

function severityRank(severity: HealthFinding['severity']): number {
  return severity === 'critical' ? 2 : 1;
}

function formatTrendBadge(badge: TrendBadge): string {
  if (badge === 'GROWING') {
    return chalk.red('[GROWING]');
  }

  if (badge === 'NEW') {
    return chalk.cyan('[NEW]');
  }

  return chalk.dim('[STABLE]');
}

function getFindingForType(snapshot: BaselineSnapshot, tensionType: string): HealthFinding | undefined {
  return snapshot.findings.find((finding) => finding.tensionType === tensionType);
}

function buildTensionTrendRows(snapshots: BaselineSnapshot[]): TensionTrendRow[] {
  const tensionTypes = new Set<string>();

  for (const snapshot of snapshots) {
    for (const finding of snapshot.findings) {
      tensionTypes.add(finding.tensionType);
    }
  }

  const latestSnapshot = snapshots[snapshots.length - 1];
  const rows: TensionTrendRow[] = [];

  for (const tensionType of tensionTypes) {
    const appearances = snapshots.filter((snapshot) => getFindingForType(snapshot, tensionType) !== undefined);
    const scanCount = appearances.length;
    let badge: TrendBadge = 'STABLE';

    if (scanCount === 1 && getFindingForType(latestSnapshot, tensionType) !== undefined) {
      badge = 'NEW';
    } else if (appearances.length >= 2) {
      const firstSeverity = getFindingForType(appearances[0], tensionType)?.severity;
      const lastSeverity = getFindingForType(appearances[appearances.length - 1], tensionType)?.severity;

      if (
        firstSeverity !== undefined &&
        lastSeverity !== undefined &&
        severityRank(lastSeverity) > severityRank(firstSeverity)
      ) {
        badge = 'GROWING';
      }
    }

    rows.push({
      tensionType,
      label: tensionTitle(tensionType),
      scanCount,
      badge,
    });
  }

  const badgeOrder: Record<TrendBadge, number> = {
    GROWING: 0,
    NEW: 1,
    STABLE: 2,
  };

  return rows.sort((a, b) => {
    if (badgeOrder[a.badge] !== badgeOrder[b.badge]) {
      return badgeOrder[a.badge] - badgeOrder[b.badge];
    }

    return a.label.localeCompare(b.label);
  });
}

function printScoreTrend(snapshots: BaselineSnapshot[]): void {
  for (const snapshot of snapshots) {
    const barLength = Math.max(1, Math.round((snapshot.score / 100) * BAR_WIDTH));
    const bar = '▓'.repeat(barLength);
    console.log(`${String(snapshot.score).padStart(SCORE_LABEL_WIDTH)} ${chalk.cyan(bar)}`);
  }

  console.log('');

  if (snapshots.length === 1) {
    console.log(formatSnapshotDate(snapshots[0].savedAt));
    return;
  }

  const dateLabels = snapshots.map((snapshot) => formatSnapshotDate(snapshot.savedAt));
  const slots = snapshots.length;
  const slotWidth = Math.floor(BAR_WIDTH / slots);
  const positionedLabels = dateLabels.map((label, index) => {
    const offset = SCORE_LABEL_WIDTH + 1 + index * slotWidth;
    return { label, offset };
  });

  let line = ' '.repeat(SCORE_LABEL_WIDTH + 1 + BAR_WIDTH);

  for (const { label, offset } of positionedLabels) {
    const before = line.slice(0, offset);
    const after = line.slice(offset + label.length);
    line = `${before}${label}${after}`;
  }

  console.log(line.trimEnd());
}

function printTensionHistory(snapshots: BaselineSnapshot[]): void {
  console.log('');
  console.log('Tension history');
  console.log('');
  console.log(chalk.dim(SEPARATOR));
  console.log('');

  const rows = buildTensionTrendRows(snapshots);

  if (rows.length === 0) {
    console.log(chalk.dim('No tensions recorded in this window.'));
    console.log('');
    return;
  }

  const labelWidth = Math.max(...rows.map((row) => row.label.length));

  for (const row of rows) {
    const scanLabel = `${row.scanCount} scan${row.scanCount === 1 ? '' : 's'}`;
    console.log(
      `${row.label.padEnd(labelWidth)}    present for ${scanLabel.padEnd(8)} ${formatTrendBadge(row.badge)}`,
    );
  }

  console.log('');
}

export function printDriftReport(snapshots: BaselineSnapshot[], options: DriftReportOptions): void {
  const repoName = resolveRepoName(options.repoPath);

  console.log('');
  console.log(chalk.bold(`Architecture Drift · ${repoName}`));
  console.log('');
  console.log(`Last ${snapshots.length} scan${snapshots.length === 1 ? '' : 's'}`);
  console.log('Score trend');
  console.log('');
  printScoreTrend(snapshots);
  printTensionHistory(snapshots);
  console.log(chalk.dim(SEPARATOR));
  console.log('');
}
