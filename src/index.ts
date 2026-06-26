export type { Finding, Severity, GitContext, GitContextOptions, RepoContext, RepoFile, RepoLayer } from './models/index.js';
export { inferLayer, inferModule } from './models/index.js';
export { buildGitContext, createGitService } from './git/index.js';
export type { GitService, GitRepositoryInfo, GitDiffOptions } from './git/index.js';
export { buildRepoContext } from './repo/index.js';
export { AnalyzerManager, analyzerManager, type Analyzer } from './analyzers/index.js';
export { missingTestsAnalyzer, isBusinessLogicPath, isTestProjectPath } from './analyzers/index.js';
export { missingMigrationAnalyzer, isEntityPath, isMigrationPath } from './analyzers/index.js';
export {
  missingAuthorizeAnalyzer,
  isControllerFile,
  hasControllerLevelAuthorize,
  findUnprotectedNewEndpoints,
  type UnprotectedEndpoint,
} from './analyzers/index.js';
export {
  publicApiAnalyzer,
  isCSharpFile,
  parsePublicApiDeclaration,
  findPublicApiChanges,
  type PublicApiKind,
  type PublicApiChangeType,
  type PublicApiChange,
} from './analyzers/index.js';
export {
  getReporter,
  consoleReporter,
  terminalReporter,
  jsonReporter,
  buildReport,
  reportFindings,
  formatFinding,
  type Reporter,
  type ReportFormat,
  type PrSanityReport,
} from './reporters/index.js';
export {
  calculateRisk,
  formatRiskLevel,
  getFindingDisplayLabel,
  type RiskLevel,
  type RiskRule,
  type RiskBreakdownEntry,
  type RiskAssessment,
} from './risk/index.js';
export {
  HealthAnalyzerManager,
  healthAnalyzerManager,
  resultPatternAnalyzer,
  detectResultPattern,
  detectResultPatterns,
  buildResultPatternFinding,
  validationStrategyAnalyzer,
  detectValidationStrategy,
  detectValidationStrategies,
  buildValidationStrategyFinding,
  persistenceBypassAnalyzer,
  detectPersistenceBypass,
  buildPersistenceBypassFinding,
  cqrsBypassAnalyzer,
  isHandlerFile,
  detectCqrsBypass,
  buildCqrsBypassFinding,
  clusterByModule,
  printHealthReport,
  calculateHealthScore,
  buildHealthComment,
  buildHealthHtml,
  buildHealthCiSummary,
  resolveRepoName,
  saveBaseline,
  loadBaseline,
  loadBaselineFile,
  loadBaselineTimeline,
  diffBaseline,
  printDriftReport,
  type HealthAnalyzer,
  type HealthFinding,
  type ResultPatternLabel,
  type ValidationStrategyLabel,
  type ModuleTensionSummary,
  type HealthReportOptions,
  type BaselineSnapshot,
  type BaselineFile,
  type BaselineDiff,
  type DriftReportOptions,
  type HealthCiSummary,
} from './health/index.js';
export {
  loadConfig,
  isIgnoredModule,
  isIgnoredAnalyzer,
  filterFilesByModule,
  type PrSanityConfig,
} from './config/index.js';
export {
  createProgram,
  runCheck,
  runHealth,
  runDrift,
  runStatus,
  type CheckOptions,
  type HealthOptions,
  type HealthReportFormat,
  type DriftOptions,
} from './cli.js';

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createProgram } from './cli.js';

const isMain =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  createProgram().parse(process.argv);
}
