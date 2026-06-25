import type { Finding } from './finding.js';

export interface AnalysisResult {
  analyzerId: string;
  findings: Finding[];
}
