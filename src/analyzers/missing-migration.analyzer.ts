import type { GitContext } from '../models/git-context.js';
import type { Finding } from '../models/finding.js';
import type { Analyzer } from './types.js';

const ENTITIES_SEGMENT = /^Entities$/i;
const MIGRATIONS_SEGMENT = /^Migrations$/i;
const MIGRATION_FILE = /^\d{14}_.+\.cs$/i;
const MIGRATION_DESIGNER_FILE = /^\d{14}_.+\.Designer\.cs$/i;
const MODEL_SNAPSHOT_FILE = /ModelSnapshot\.cs$/i;

function normalizePath(file: string): string {
  return file.replace(/\\/g, '/');
}

function getPathSegments(file: string): string[] {
  return normalizePath(file).split('/').filter(Boolean);
}

function getFileName(file: string): string {
  const segments = getPathSegments(file);
  return segments[segments.length - 1] ?? file;
}

function isCSharpFile(file: string): boolean {
  return getFileName(file).toLowerCase().endsWith('.cs');
}

export function isEntityPath(file: string): boolean {
  if (!isCSharpFile(file)) {
    return false;
  }

  return getPathSegments(file).some((segment) => ENTITIES_SEGMENT.test(segment));
}

export function isMigrationPath(file: string): boolean {
  if (!isCSharpFile(file)) {
    return false;
  }

  const hasMigrationsSegment = getPathSegments(file).some((segment) =>
    MIGRATIONS_SEGMENT.test(segment),
  );
  if (!hasMigrationsSegment) {
    return false;
  }

  const fileName = getFileName(file);
  return (
    MIGRATION_FILE.test(fileName) ||
    MIGRATION_DESIGNER_FILE.test(fileName) ||
    MODEL_SNAPSHOT_FILE.test(fileName)
  );
}

export const missingMigrationAnalyzer: Analyzer = {
  async run(context: GitContext): Promise<Finding[]> {
    const entityFiles = context.changedFiles.filter(isEntityPath);
    if (entityFiles.length === 0) {
      return [];
    }

    const hasMigrationChanges = context.changedFiles.some(isMigrationPath);
    if (hasMigrationChanges) {
      return [];
    }

    return [
      {
        severity: 'warning',
        title: 'Entity changes without migration',
        explanation:
          'Entity classes were modified but no EF Core migration files were added or updated in this diff. Run dotnet ef migrations add if the model changed.',
        file: entityFiles[0],
      },
    ];
  },
};
