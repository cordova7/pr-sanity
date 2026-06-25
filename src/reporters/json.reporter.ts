import type { AnalysisResult } from '../models/analysis-result.js';
import type { Reporter } from './types.js';

export const jsonReporter: Reporter = {
  report(results: AnalysisResult[]): void {
    console.log(JSON.stringify({ results }, null, 2));
  },
};
