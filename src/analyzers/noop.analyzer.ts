import type { Analyzer } from './types.js';
import type { GitContext } from '../models/git-context.js';
import type { AnalysisResult } from '../models/analysis-result.js';

export const noopAnalyzer: Analyzer = {
  id: 'noop',
  description: 'Example analyzer stub that always passes',

  async run(_context: GitContext): Promise<AnalysisResult> {
    return {
      analyzerId: 'noop',
      findings: [],
    };
  },
};
