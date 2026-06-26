import { filterFilesByModule, type PrSanityConfig } from '../../config/config.js';
import type { RepoContext, RepoFile, RepoLayer } from '../../models/repo-context.js';
import { logSkip, readAnalyzerFile } from '../analyzer-io.js';
import type { HealthAnalyzer, HealthFinding } from '../health-analyzer.interface.js';
import { getSkipFileReason } from './should-skip-file.js';

const NULL_CHECK = /if\s*\([^)]*(?:==\s*null|is\s+null)/i;
const DATA_ANNOTATIONS_USING = /using\s+[\w.]*DataAnnotations/i;

export type ValidationStrategyLabel = 'FluentValidation' | 'DataAnnotations' | 'manual';

interface ClassifiedFile {
  path: string;
  module: string;
  pattern: ValidationStrategyLabel;
}

const SCANNED_LAYERS = new Set<RepoLayer>(['Application', 'API']);

function isFluentValidation(content: string): boolean {
  return content.includes('using FluentValidation') || content.includes(': AbstractValidator<');
}

function isDataAnnotations(content: string): boolean {
  return (
    content.includes('[Required]') ||
    content.includes('[Range]') ||
    content.includes('[StringLength]') ||
    DATA_ANNOTATIONS_USING.test(content)
  );
}

function isManualValidation(content: string): boolean {
  const hasIValidatorWithoutFluent = content.includes('IValidator') && !isFluentValidation(content);
  const hasModelStateWithNullCheck = content.includes('ModelState') && NULL_CHECK.test(content);
  return hasIValidatorWithoutFluent || hasModelStateWithNullCheck;
}

export function detectValidationStrategy(content: string): ValidationStrategyLabel | null {
  const patterns = detectValidationStrategies(content);
  return patterns[0] ?? null;
}

// Rule: a file may contribute multiple validation strategies (e.g. FluentValidation + [Required]).
export function detectValidationStrategies(content: string): ValidationStrategyLabel[] {
  const patterns: ValidationStrategyLabel[] = [];

  if (isFluentValidation(content)) {
    patterns.push('FluentValidation');
  }

  if (isDataAnnotations(content)) {
    patterns.push('DataAnnotations');
  }

  if (isManualValidation(content)) {
    patterns.push('manual');
  }

  return patterns;
}

export function buildValidationStrategyFinding(
  classified: ClassifiedFile[],
  blessedPattern?: string,
): HealthFinding | null {
  const patternCounts = new Map<ValidationStrategyLabel, number>();

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

  const dominantPattern = (blessedPattern as ValidationStrategyLabel | undefined) ?? sortedPatterns[0][0];
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
    tensionType: 'validation-strategy-inconsistency',
    severity: patternCounts.size >= 3 ? 'critical' : 'warning',
    title: 'Validation strategy inconsistency',
    detail: detailParts.join(', '),
    affectedFiles,
  };
}

function shouldScanFile(file: RepoFile): boolean {
  return SCANNED_LAYERS.has(file.layer);
}

export const validationStrategyAnalyzer: HealthAnalyzer = {
  name: 'validation-strategy',

  async run(context: RepoContext, config: PrSanityConfig): Promise<HealthFinding[]> {
    const classified: ClassifiedFile[] = [];
    const files = filterFilesByModule(context.files, config);

    for (const file of files) {
      if (!shouldScanFile(file)) {
        continue;
      }

      const reason = getSkipFileReason(file.path, file.layer);

      if (reason !== null) {
        logSkip(context, file, reason);
        continue;
      }

      const content = await readAnalyzerFile(context, file);
      const patterns =
        content === null ? [] : detectValidationStrategies(content);

      for (const pattern of patterns) {
        classified.push({
          path: file.path,
          module: file.module,
          pattern,
        });
      }
    }

    const blessedPattern = config.health?.blessed?.validationStrategy;
    const finding = buildValidationStrategyFinding(classified, blessedPattern);
    return finding === null ? [] : [finding];
  },
};
