import type { GitContext } from '../models/git-context.js';
import type { AnalysisResult } from '../models/analysis-result.js';

export interface Analyzer {
  readonly id: string;
  readonly description: string;
  run(context: GitContext): Promise<AnalysisResult>;
}
