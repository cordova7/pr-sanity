import type { Analyzer } from './types.js';
import type { GitContext } from '../models/git-context.js';
import type { AnalysisResult } from '../models/analysis-result.js';
import { noopAnalyzer } from './noop.analyzer.js';

const registry = new Map<string, Analyzer>();

function register(analyzer: Analyzer): void {
  registry.set(analyzer.id, analyzer);
}

register(noopAnalyzer);

export function listAnalyzers(): Analyzer[] {
  return Array.from(registry.values());
}

export function getAnalyzer(id: string): Analyzer | undefined {
  return registry.get(id);
}

export async function runAnalyzers(
  context: GitContext,
  analyzerIds?: string[],
): Promise<AnalysisResult[]> {
  const selected =
    analyzerIds && analyzerIds.length > 0
      ? analyzerIds.map((id) => {
          const analyzer = getAnalyzer(id);
          if (!analyzer) {
            throw new Error(`Unknown analyzer: ${id}`);
          }
          return analyzer;
        })
      : listAnalyzers();

  const results: AnalysisResult[] = [];

  for (const analyzer of selected) {
    const result = await analyzer.run(context);
    results.push(result);
  }

  return results;
}

export type { Analyzer } from './types.js';
export { noopAnalyzer } from './noop.analyzer.js';
