import type { Finding } from '../models/finding.js';

export interface Reporter {
  report(findings: Finding[]): void;
}
