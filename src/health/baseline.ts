import fs from 'node:fs';
import path from 'node:path';
import type { HealthFinding } from './health-analyzer.interface.js';
import { clusterByModule } from './tension-clusterer.js';

const MAX_HISTORY = 12;

export interface BaselineSnapshot {
  savedAt: string;
  score: number;
  tensionCount: number;
  findings: HealthFinding[];
  moduleScores: Record<string, number>;
}

export interface BaselineFile {
  current: BaselineSnapshot;
  history: BaselineSnapshot[];
}

export interface BaselineDiff {
  scoreDelta: number;
  newTensions: HealthFinding[];
  resolvedTensions: HealthFinding[];
  worseningModules: string[];
}

export function calculateHealthScore(findings: HealthFinding[]): number {
  const criticalCount = findings.filter((finding) => finding.severity === 'critical').length;
  const warningCount = findings.filter((finding) => finding.severity === 'warning').length;
  return Math.max(0, 100 - criticalCount * 12 - warningCount * 5);
}

function calculateModuleScore(criticalCount: number, tensionCount: number): number {
  const warningCount = tensionCount - criticalCount;
  return Math.max(0, 100 - criticalCount * 12 - warningCount * 5);
}

function buildModuleScores(findings: HealthFinding[]): Record<string, number> {
  const moduleScores: Record<string, number> = {};

  for (const cluster of clusterByModule(findings)) {
    moduleScores[cluster.module] = calculateModuleScore(cluster.criticalCount, cluster.tensionCount);
  }

  return moduleScores;
}

function ensureGitignoreEntry(rootPath: string): void {
  const gitignorePath = path.join(rootPath, '.gitignore');

  if (!fs.existsSync(gitignorePath)) {
    return;
  }

  const contents = fs.readFileSync(gitignorePath, 'utf8');

  if (contents.includes('.pr-sanity')) {
    return;
  }

  const suffix = contents.endsWith('\n') ? '' : '\n';
  fs.writeFileSync(gitignorePath, `${contents}${suffix}.pr-sanity/\n`, 'utf8');
}

function isBaselineSnapshot(value: unknown): value is BaselineSnapshot {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const snapshot = value as Partial<BaselineSnapshot>;

  return (
    typeof snapshot.savedAt === 'string' &&
    typeof snapshot.score === 'number' &&
    typeof snapshot.tensionCount === 'number' &&
    Array.isArray(snapshot.findings)
  );
}

function isBaselineFile(value: unknown): value is BaselineFile {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const file = value as Partial<BaselineFile>;

  return isBaselineSnapshot(file.current) && Array.isArray(file.history) && file.history.every(isBaselineSnapshot);
}

function buildSnapshot(findings: HealthFinding[]): BaselineSnapshot {
  return {
    savedAt: new Date().toISOString(),
    score: calculateHealthScore(findings),
    tensionCount: findings.length,
    findings,
    moduleScores: buildModuleScores(findings),
  };
}

function getBaselinePath(rootPath: string): string {
  return path.join(rootPath, '.pr-sanity', 'baseline.json');
}

export function loadBaselineFile(rootPath: string): BaselineFile | null {
  const baselinePath = getBaselinePath(rootPath);

  if (!fs.existsSync(baselinePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(baselinePath, 'utf8');
    const parsed: unknown = JSON.parse(raw);

    if (isBaselineFile(parsed)) {
      return parsed;
    }

    if (isBaselineSnapshot(parsed)) {
      return {
        current: parsed,
        history: [],
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function loadBaseline(rootPath: string): BaselineSnapshot | null {
  return loadBaselineFile(rootPath)?.current ?? null;
}

export function loadBaselineTimeline(rootPath: string, last: number): BaselineSnapshot[] {
  const baselineFile = loadBaselineFile(rootPath);

  if (baselineFile === null) {
    return [];
  }

  const timeline = [...baselineFile.history, baselineFile.current].sort((a, b) =>
    a.savedAt.localeCompare(b.savedAt),
  );

  const cappedLast = Math.min(Math.max(last, 1), MAX_HISTORY);
  return timeline.slice(-cappedLast);
}

export function saveBaseline(findings: HealthFinding[], rootPath: string): void {
  const baselineDir = path.join(rootPath, '.pr-sanity');
  fs.mkdirSync(baselineDir, { recursive: true });

  const existing = loadBaselineFile(rootPath);
  const snapshot = buildSnapshot(findings);
  const history = existing === null ? [] : [...existing.history, existing.current];

  const baselineFile: BaselineFile = {
    current: snapshot,
    history: history.slice(-MAX_HISTORY),
  };

  fs.writeFileSync(getBaselinePath(rootPath), JSON.stringify(baselineFile, null, 2), 'utf8');
  ensureGitignoreEntry(rootPath);
}

export function diffBaseline(current: HealthFinding[], baseline: BaselineSnapshot): BaselineDiff {
  const currentTypes = new Set(current.map((finding) => finding.tensionType));
  const baselineTypes = new Set(baseline.findings.map((finding) => finding.tensionType));

  const newTensions = current.filter((finding) => !baselineTypes.has(finding.tensionType));
  const resolvedTensions = baseline.findings.filter((finding) => !currentTypes.has(finding.tensionType));
  const scoreDelta = calculateHealthScore(current) - baseline.score;

  const currentClusters = clusterByModule(current);
  const baselineCriticalByModule = new Map(
    clusterByModule(baseline.findings).map((cluster) => [cluster.module, cluster.criticalCount]),
  );

  const worseningModules = currentClusters
    .filter((cluster) => {
      const baselineCriticalCount = baselineCriticalByModule.get(cluster.module) ?? 0;
      return baselineCriticalCount < cluster.criticalCount;
    })
    .map((cluster) => cluster.module)
    .sort((a, b) => a.localeCompare(b));

  return {
    scoreDelta,
    newTensions,
    resolvedTensions,
    worseningModules,
  };
}
