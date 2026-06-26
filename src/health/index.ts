export type { HealthAnalyzer, HealthFinding } from './health-analyzer.interface.js';
export { HealthAnalyzerManager, healthAnalyzerManager } from './health-analyzer-manager.js';
export {
  resultPatternAnalyzer,
  detectResultPattern,
  detectResultPatterns,
  buildResultPatternFinding,
  type ResultPatternLabel,
} from './analyzers/result-pattern.analyzer.js';
export {
  validationStrategyAnalyzer,
  detectValidationStrategy,
  detectValidationStrategies,
  buildValidationStrategyFinding,
  type ValidationStrategyLabel,
} from './analyzers/validation-strategy.analyzer.js';
export {
  persistenceBypassAnalyzer,
  detectPersistenceBypass,
  buildPersistenceBypassFinding,
} from './analyzers/persistence-bypass.analyzer.js';
export {
  cqrsBypassAnalyzer,
  isHandlerFile,
  detectCqrsBypass,
  buildCqrsBypassFinding,
} from './analyzers/cqrs-bypass.analyzer.js';
export { clusterByModule, type ModuleTensionSummary } from './tension-clusterer.js';
export {
  printHealthReport,
  calculateHealthScore,
  formatBaselineDeltaPlain,
  resolveRepoName,
  tensionShortLabel,
  PASSING_PLACEHOLDERS,
  parseDetailSegments,
  type HealthReportOptions,
} from './health-reporter.js';
export { buildHealthComment } from './github-comment.js';
export { buildHealthHtml } from './html-reporter.js';
export { buildHealthCiSummary, type HealthCiSummary } from './ci-summary.js';
export {
  saveBaseline,
  loadBaseline,
  loadBaselineFile,
  loadBaselineTimeline,
  diffBaseline,
  type BaselineSnapshot,
  type BaselineFile,
  type BaselineDiff,
} from './baseline.js';
export { printDriftReport, type DriftReportOptions } from './drift-reporter.js';
export { loadDemoSnapshot, type DemoSnapshot } from './demo/load-demo-snapshot.js';

import { cqrsBypassAnalyzer } from './analyzers/cqrs-bypass.analyzer.js';
import { persistenceBypassAnalyzer } from './analyzers/persistence-bypass.analyzer.js';
import { resultPatternAnalyzer } from './analyzers/result-pattern.analyzer.js';
import { validationStrategyAnalyzer } from './analyzers/validation-strategy.analyzer.js';
import { healthAnalyzerManager } from './health-analyzer-manager.js';

healthAnalyzerManager.register(resultPatternAnalyzer);
healthAnalyzerManager.register(validationStrategyAnalyzer);
healthAnalyzerManager.register(persistenceBypassAnalyzer);
healthAnalyzerManager.register(cqrsBypassAnalyzer);
