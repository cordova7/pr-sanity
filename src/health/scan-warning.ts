import type { RepoContext } from '../models/repo-context.js';
import type { HealthFinding } from './health-analyzer.interface.js';

const READ_FAILURE_THRESHOLD = 0.2;

export function buildScanWarningFinding(context: RepoContext): HealthFinding | null {
  const readFailures = context.healthRun?.readFailures ?? [];
  const totalFiles = context.files.length;

  if (totalFiles === 0 || readFailures.length / totalFiles <= READ_FAILURE_THRESHOLD) {
    return null;
  }

  const percentage = Math.round((readFailures.length / totalFiles) * 100);

  return {
    module: 'Repository',
    tensionType: 'scan-warning',
    severity: 'warning',
    title: 'Many files unreadable',
    detail: `${readFailures.length} of ${totalFiles} files (${percentage}%) could not be read`,
    affectedFiles: [...readFailures].sort((a, b) => a.localeCompare(b)).slice(0, 10),
  };
}
