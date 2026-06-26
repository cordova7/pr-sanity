import path from 'node:path';
import pc from 'picocolors';
import type { Finding, Severity } from '../models/finding.js';
import {
  calculateRisk,
  formatRiskLevel,
  getFindingDisplayLabel,
  type RiskLevel,
} from '../risk/index.js';
import type { Reporter } from './types.js';

const SEPARATOR = '━'.repeat(24);
const FILE_INDENT = '  ';
const INDENT = '         ';

const severityBadge: Record<Severity, (text: string) => string> = {
  error: (text) => pc.red(pc.bold(text)),
  warning: (text) => pc.yellow(pc.bold(text)),
  info: (text) => pc.cyan(pc.bold(text)),
};

const severityLabel: Record<Severity, string> = {
  error: 'ERROR  ',
  warning: 'WARNING',
  info: 'INFO   ',
};

const riskLevelColor: Record<RiskLevel, (text: string) => string> = {
  Low: (text) => pc.green(text),
  Medium: (text) => pc.yellow(text),
  High: (text) => pc.red(pc.bold(text)),
};

const sectionIcons: Record<Severity, string> = {
  error: '✖',
  warning: '⚠',
  info: 'ℹ',
};

function styleTitle(severity: Severity, title: string): string {
  const colorize = severityBadge[severity];
  return `${colorize(severityLabel[severity])} ${colorize(title)}`;
}

export function formatFinding(finding: Finding): string[] {
  const lines = [styleTitle(finding.severity, finding.title)];

  if (finding.file !== undefined) {
    lines.push(`${INDENT}${pc.dim(pc.cyan(finding.file))}`);
  }

  lines.push(`${INDENT}${pc.dim(finding.explanation)}`);
  return lines;
}

function printSeparator(): void {
  console.log(SEPARATOR);
}

function printRiskHeader(findings: Finding[]): void {
  const risk = calculateRisk(findings);
  const colorize = riskLevelColor[risk.level];

  console.log();
  console.log(pc.bold('PR SANITY'));
  console.log();
  console.log(`Risk Score: ${risk.score} (${colorize(formatRiskLevel(risk.level))})`);
  console.log();
}

function formatFileName(file: string): string {
  return path.basename(file.replace(/\\/g, '/'));
}

function printCompactFinding(finding: Finding): void {
  const label = getFindingDisplayLabel(finding);
  const icon = sectionIcons[finding.severity];
  const colorize = severityBadge[finding.severity];

  console.log(colorize(`${icon} ${label}`));

  if (finding.file !== undefined) {
    console.log(`${FILE_INDENT}${formatFileName(finding.file)}`);
  }

  console.log();
}

function printFindingSection(title: string, findings: Finding[]): void {
  if (findings.length === 0) {
    return;
  }

  console.log(title);
  console.log();

  for (const finding of findings) {
    printCompactFinding(finding);
  }
}

function printSummary(findings: Finding[]): void {
  console.log('Summary');
  console.log();

  if (findings.length === 0) {
    console.log('No findings detected');
  } else {
    console.log(`${findings.length} finding${findings.length === 1 ? '' : 's'} detected`);
  }

  console.log();
}

export function reportFindings(findings: Finding[]): void {
  console.log();
  printSeparator();
  printRiskHeader(findings);

  printFindingSection(
    'Warnings',
    findings.filter((finding) => finding.severity === 'warning'),
  );
  printFindingSection(
    'Errors',
    findings.filter((finding) => finding.severity === 'error'),
  );
  printFindingSection(
    'Info',
    findings.filter((finding) => finding.severity === 'info'),
  );

  printSeparator();
  printSummary(findings);
  printSeparator();
}

export const terminalReporter: Reporter = {
  report(findings: Finding[]): void {
    reportFindings(findings);
  },
};
