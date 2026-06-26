export type { Analyzer } from './types.js';
export { AnalyzerManager, analyzerManager } from './analyzer-manager.js';
export {
  missingTestsAnalyzer,
  isBusinessLogicPath,
  isTestProjectPath,
} from './missing-tests.analyzer.js';
export {
  missingMigrationAnalyzer,
  isEntityPath,
  isMigrationPath,
} from './missing-migration.analyzer.js';
export {
  missingAuthorizeAnalyzer,
  isControllerFile,
  hasControllerLevelAuthorize,
  findUnprotectedNewEndpoints,
  type UnprotectedEndpoint,
} from './missing-authorize.analyzer.js';
export {
  publicApiAnalyzer,
  isCSharpFile,
  parsePublicApiDeclaration,
  findPublicApiChanges,
  type PublicApiKind,
  type PublicApiChangeType,
  type PublicApiChange,
} from './public-api.analyzer.js';

import { analyzerManager } from './analyzer-manager.js';
import { missingAuthorizeAnalyzer } from './missing-authorize.analyzer.js';
import { missingMigrationAnalyzer } from './missing-migration.analyzer.js';
import { missingTestsAnalyzer } from './missing-tests.analyzer.js';
import { publicApiAnalyzer } from './public-api.analyzer.js';

analyzerManager.register(missingTestsAnalyzer);
analyzerManager.register(missingMigrationAnalyzer);
analyzerManager.register(missingAuthorizeAnalyzer);
analyzerManager.register(publicApiAnalyzer);
