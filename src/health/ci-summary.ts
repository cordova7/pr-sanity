import { calculateHealthScore } from './baseline.js';
import type { HealthFinding } from './health-analyzer.interface.js';
import type { ModuleTensionSummary } from './tension-clusterer.js';

export interface HealthCiSummary {
  score: number;
  criticalCount: number;
  warningCount: number;
  tensionCount: number;
  hasCritical: boolean;
  findings: HealthFinding[];
  moduleSummaries: ModuleTensionSummary[];
  sinceLastScan?: string;
}

export function buildHealthCiSummary(
  findings: HealthFinding[],
  moduleSummaries: ModuleTensionSummary[],
): HealthCiSummary {
  const criticalCount = findings.filter((finding) => finding.severity === 'critical').length;
  const warningCount = findings.filter((finding) => finding.severity === 'warning').length;

  return {
    score: calculateHealthScore(findings),
    criticalCount,
    warningCount,
    tensionCount: findings.length,
    hasCritical: criticalCount > 0,
    findings,
    moduleSummaries,
  };
}
