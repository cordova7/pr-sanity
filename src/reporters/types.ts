import type { AnalysisResult } from '../models/analysis-result.js';

export interface Reporter {
  report(results: AnalysisResult[]): void;
}
