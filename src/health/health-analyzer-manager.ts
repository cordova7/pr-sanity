import type { PrSanityConfig } from '../config/config.js';
import { isIgnoredAnalyzer } from '../config/config.js';
import type { RepoContext } from '../models/repo-context.js';
import type { HealthAnalyzer, HealthFinding } from './health-analyzer.interface.js';
import { buildScanWarningFinding } from './scan-warning.js';

const ANALYZER_LABELS: Record<string, string> = {
  'result-pattern': 'Running Result pattern detector...',
  'validation-strategy': 'Running Validation strategy detector...',
  'persistence-bypass': 'Running Persistence bypass detector...',
  'cqrs-bypass': 'Running CQRS bypass detector...',
};

export interface HealthRunProgressOptions {
  onAnalyzerStart?: (label: string) => void;
  onAnalyzerComplete?: (name: string, durationMs: number) => void;
}

export class HealthAnalyzerManager {
  private readonly analyzers: HealthAnalyzer[] = [];

  register(analyzer: HealthAnalyzer): void {
    this.analyzers.push(analyzer);
  }

  list(): ReadonlyArray<HealthAnalyzer> {
    return this.analyzers;
  }

  async runAll(
    context: RepoContext,
    config: PrSanityConfig = {},
    progress: HealthRunProgressOptions = {},
  ): Promise<HealthFinding[]> {
    const findings: HealthFinding[] = [];

    for (const analyzer of this.analyzers) {
      if (isIgnoredAnalyzer(analyzer.name, config)) {
        continue;
      }

      const label = ANALYZER_LABELS[analyzer.name] ?? `Running ${analyzer.name}...`;
      progress.onAnalyzerStart?.(label);

      const start = performance.now();

      try {
        const result = await analyzer.run(context, config);
        findings.push(...result);
      } catch {
        context.healthRun?.debug(`Analyzer ${analyzer.name} failed; skipping`);
      }

      const durationMs = Math.round(performance.now() - start);
      progress.onAnalyzerComplete?.(analyzer.name, durationMs);
    }

    const scanWarning = buildScanWarningFinding(context);

    if (scanWarning !== null) {
      findings.push(scanWarning);
    }

    return findings;
  }
}

export const healthAnalyzerManager = new HealthAnalyzerManager();
