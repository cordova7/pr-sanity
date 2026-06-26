import { filterFilesByModule, type PrSanityConfig } from '../../config/config.js';
import type { RepoContext, RepoFile } from '../../models/repo-context.js';
import { logSkip, readAnalyzerFile } from '../analyzer-io.js';
import type { HealthAnalyzer, HealthFinding } from '../health-analyzer.interface.js';
import { getSkipFileReason } from './should-skip-file.js';

const DB_CONTEXT_FIELD = /\b(?:private|protected|internal|public|readonly)[^;\n]*\bDbContext\b/;
const DB_CONTEXT_CTOR = /\([^)]*\bDbContext\b[^)]*\)/;
const CONTEXT_FIELD_USAGE = /\b_context\./;
const EF_SET = /\.Set</;
const DB_SET = /\bDbSet</;

// Rule: DbContext inside // comments or string literals is not persistence access — strip before heuristics.
function stripCommentsAndStrings(content: string): string {
  return content
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, '').trim())
    .join('\n')
    .replace(/"[^"]*"/g, '""')
    .replace(/'[^']*'/g, "''");
}

interface ClassifiedFile {
  path: string;
  module: string;
}

export function detectPersistenceBypass(content: string): boolean {
  const scannable = stripCommentsAndStrings(content);

  return (
    DB_CONTEXT_FIELD.test(scannable) ||
    DB_CONTEXT_CTOR.test(scannable) ||
    CONTEXT_FIELD_USAGE.test(scannable) ||
    EF_SET.test(scannable) ||
    DB_SET.test(scannable)
  );
}

export function buildPersistenceBypassFinding(
  bypassFiles: ClassifiedFile[],
  totalApplicationFiles: number,
  // Default 10% (0.1) — rates below this are treated as acceptable noise, not a repo-wide tension.
  threshold = 0.1,
): HealthFinding | null {
  if (totalApplicationFiles === 0) {
    return null;
  }

  const bypassRate = bypassFiles.length / totalApplicationFiles;

  if (bypassRate <= threshold) {
    return null;
  }

  const percentage = Math.round(bypassRate * 100);
  const moduleCounts = new Map<string, number>();

  for (const file of bypassFiles) {
    moduleCounts.set(file.module, (moduleCounts.get(file.module) ?? 0) + 1);
  }

  const topModules = [...moduleCounts.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }

      return a[0].localeCompare(b[0]);
    })
    .slice(0, 3)
    .map(([moduleName]) => moduleName);

  const affectedFiles = bypassFiles
    .map((file) => file.path)
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 8);

  return {
    module: topModules.join(', '),
    tensionType: 'persistence-bypass',
    severity: bypassRate > 0.3 ? 'critical' : 'warning',
    title: 'Repository pattern bypass in Application layer',
    detail: `${bypassFiles.length} of ${totalApplicationFiles} Application-layer files (${percentage}%) access DbContext directly`,
    affectedFiles,
  };
}

function isApplicationLayer(file: RepoFile): boolean {
  return file.layer === 'Application';
}

export const persistenceBypassAnalyzer: HealthAnalyzer = {
  name: 'persistence-bypass',

  async run(context: RepoContext, config: PrSanityConfig): Promise<HealthFinding[]> {
    const files = filterFilesByModule(context.files, config);
    const applicationFiles = files.filter(isApplicationLayer);
    const scannableFiles: RepoFile[] = [];

    for (const file of applicationFiles) {
      if (file.layer !== 'Application') {
        continue;
      }

      const reason = getSkipFileReason(file.path, file.layer);

      if (reason !== null) {
        logSkip(context, file, reason);
        continue;
      }

      scannableFiles.push(file);
    }

    const bypassFiles: ClassifiedFile[] = [];

    for (const file of scannableFiles) {
      const content = await readAnalyzerFile(context, file);

      if (content === null) {
        continue;
      }

      if (!detectPersistenceBypass(content)) {
        continue;
      }

      bypassFiles.push({
        path: file.path,
        module: file.module,
      });
    }

    const threshold = config.health?.thresholds?.persistenceBypassRate ?? 0.1;
    const finding = buildPersistenceBypassFinding(bypassFiles, scannableFiles.length, threshold);
    return finding === null ? [] : [finding];
  },
};
