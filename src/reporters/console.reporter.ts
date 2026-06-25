import type { AnalysisResult } from '../models/analysis-result.js';
import type { Finding } from '../models/finding.js';
import type { Reporter } from './types.js';

const severityLabel: Record<Finding['severity'], string> = {
  error: 'ERROR',
  warning: 'WARN ',
  info: 'INFO ',
};

function formatFinding(finding: Finding): string {
  const location =
    finding.file !== undefined
      ? ` (${finding.file}${finding.line !== undefined ? `:${finding.line}` : ''})`
      : '';
  return `  [${severityLabel[finding.severity]}] ${finding.message}${location}`;
}

export const consoleReporter: Reporter = {
  report(results: AnalysisResult[]): void {
    let totalFindings = 0;

    for (const result of results) {
      if (result.findings.length === 0) {
        console.log(`✓ ${result.analyzerId}: no issues`);
        continue;
      }

      console.log(`✗ ${result.analyzerId}:`);
      for (const finding of result.findings) {
        console.log(formatFinding(finding));
      }
      totalFindings += result.findings.length;
    }

    if (totalFindings === 0) {
      console.log('\nAll checks passed.');
    } else {
      console.log(`\n${totalFindings} finding(s) reported.`);
    }
  },
};
