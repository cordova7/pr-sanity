import type { Finding } from '../models/finding.js';
import { calculateRisk, type RiskAssessment } from '../risk/index.js';
import type { Reporter } from './types.js';

export interface PrSanityReport {
  findings: Finding[];
  risk: RiskAssessment;
}

export function buildReport(findings: Finding[]): PrSanityReport {
  return { findings, risk: calculateRisk(findings) };
}

export const jsonReporter: Reporter = {
  report(findings: Finding[]): void {
    console.log(JSON.stringify(buildReport(findings), null, 2));
  },
};
