import { filterFilesByModule, type PrSanityConfig } from '../../config/config.js';
import type { RepoContext } from '../../models/repo-context.js';
import { logSkip, readAnalyzerFile } from '../analyzer-io.js';
import type { HealthAnalyzer, HealthFinding } from '../health-analyzer.interface.js';
import { getSkipResultPatternReason, isResultPatternLayer } from './should-skip-file.js';

const HANDLER = /:\s*I(?:Request|Command|Query)Handler\s*</;
const HANDLER_CLASS = /class\s+\w+Handler\b/;
const RAW_BOOL_HANDLER_METHOD =
  /public\s+(?:static\s+)?(?:async\s+)?(?:Task<)?bool(?:>)?\s+(Handle|Execute|Process)\w*\s*\(/i;

// Rule: pattern tokens in // comments or string literals are not real usage — strip before matching.
function stripCommentsAndStrings(content: string): string {
  return content
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, '').trim())
    .join('\n')
    .replace(/"[^"]*"/g, '""')
    .replace(/'[^']*'/g, "''");
}

export type ResultPatternLabel = 'Ardalis.Result' | 'ErrorOr' | 'OneOf' | 'raw bool';

interface ClassifiedFile {
  path: string;
  module: string;
  pattern: ResultPatternLabel;
}

export function isHandlerLikeFile(content: string): boolean {
  return HANDLER.test(content) || HANDLER_CLASS.test(content);
}

// Rule: a file may contribute multiple result patterns (e.g. god-class mixing Ardalis + ErrorOr).
// Alias forms (`using AR = Ardalis.Result`) are matched — not only direct `using Ardalis` lines.
export function detectResultPatterns(content: string): ResultPatternLabel[] {
  const scannable = stripCommentsAndStrings(content);
  const patterns: ResultPatternLabel[] = [];

  const hasArdalis =
    scannable.includes('Ardalis.Result') ||
    (scannable.includes('using Ardalis') && scannable.includes('Result<')) ||
    /using\s+\w+\s*=\s*Ardalis\.Result\b/.test(scannable);

  if (hasArdalis) {
    patterns.push('Ardalis.Result');
  }

  const hasErrorOr =
    scannable.includes('ErrorOr<') ||
    scannable.includes('using ErrorOr') ||
    /using\s+\w+\s*=\s*ErrorOr\b/.test(scannable);

  if (hasErrorOr) {
    patterns.push('ErrorOr');
  }

  if (scannable.includes('OneOf<')) {
    patterns.push('OneOf');
  }

  // raw bool applies only to handler-like types with bool Handle/Execute — plain service methods are ignored.
  if (RAW_BOOL_HANDLER_METHOD.test(scannable) && isHandlerLikeFile(scannable)) {
    patterns.push('raw bool');
  }

  return patterns;
}

export function detectResultPattern(content: string): ResultPatternLabel | null {
  const patterns = detectResultPatterns(content);
  return patterns[0] ?? null;
}

export function buildResultPatternFinding(
  classified: ClassifiedFile[],
  blessedPattern?: string,
): HealthFinding | null {
  const patternCounts = new Map<ResultPatternLabel, number>();

  for (const file of classified) {
    patternCounts.set(file.pattern, (patternCounts.get(file.pattern) ?? 0) + 1);
  }

  if (patternCounts.size < 2) {
    return null;
  }

  const total = classified.length;
  const sortedPatterns = [...patternCounts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) {
      return b[1] - a[1];
    }

    return a[0].localeCompare(b[0]);
  });

  const dominantPattern = (blessedPattern as ResultPatternLabel | undefined) ?? sortedPatterns[0][0];
  const detailParts = sortedPatterns.map(([pattern, count]) => {
    const percentage = Math.round((count / total) * 100);
    const suffix = pattern === dominantPattern ? ', dominant' : '';
    return `${pattern}: ${count} (${percentage}%${suffix})`;
  });

  const nonDominantFiles = classified.filter((file) => file.pattern !== dominantPattern);
  const moduleCounts = new Map<string, number>();

  for (const file of nonDominantFiles) {
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

  const affectedFiles = nonDominantFiles
    .map((file) => file.path)
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 10);

  return {
    module: topModules.join(', '),
    tensionType: 'result-pattern-inconsistency',
    severity: patternCounts.size >= 3 ? 'critical' : 'warning',
    title: 'Result pattern inconsistency',
    detail: detailParts.join(', '),
    affectedFiles,
  };
}

export const resultPatternAnalyzer: HealthAnalyzer = {
  name: 'result-pattern',

  async run(context: RepoContext, config: PrSanityConfig): Promise<HealthFinding[]> {
    const classified: ClassifiedFile[] = [];
    const files = filterFilesByModule(context.files, config);

    for (const file of files) {
      if (!isResultPatternLayer(file.layer)) {
        continue;
      }

      const reason = getSkipResultPatternReason(file.path, file.layer);

      if (reason !== null) {
        logSkip(context, file, reason);
        continue;
      }

      const content = await readAnalyzerFile(context, file);
      const patterns =
        content === null ? [] : detectResultPatterns(content);

      for (const pattern of patterns) {
        classified.push({
          path: file.path,
          module: file.module,
          pattern,
        });
      }
    }

    const blessedPattern = config.health?.blessed?.resultPattern;
    const finding = buildResultPatternFinding(classified, blessedPattern);
    return finding === null ? [] : [finding];
  },
};
