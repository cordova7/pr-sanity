import type { GitContext } from '../models/git-context.js';
import type { Finding } from '../models/finding.js';
import type { Analyzer } from './types.js';

export class AnalyzerManager {
  private readonly analyzers: Analyzer[] = [];

  register(analyzer: Analyzer): void {
    this.analyzers.push(analyzer);
  }

  list(): ReadonlyArray<Analyzer> {
    return this.analyzers;
  }

  async runAll(context: GitContext): Promise<Finding[]> {
    const findings: Finding[] = [];

    for (const analyzer of this.analyzers) {
      const result = await analyzer.run(context);
      findings.push(...result);
    }

    return findings;
  }
}

export const analyzerManager = new AnalyzerManager();
