import type { GitContext } from '../models/git-context.js';
import type { Finding } from '../models/finding.js';
import type { Analyzer } from './types.js';

const BUSINESS_LOGIC_SEGMENT = /^(Services|Domain|Application)$/i;
const BUSINESS_LOGIC_PROJECT = /\.(Services|Domain|Application)$/i;
const TEST_PROJECT = /\.(Tests|UnitTests|IntegrationTests)$/i;

function normalizePath(file: string): string {
  return file.replace(/\\/g, '/');
}

function getPathSegments(file: string): string[] {
  return normalizePath(file).split('/').filter(Boolean);
}

function segmentMatchesBusinessLogic(segment: string): boolean {
  return BUSINESS_LOGIC_SEGMENT.test(segment) || BUSINESS_LOGIC_PROJECT.test(segment);
}

function segmentMatchesTestProject(segment: string): boolean {
  return TEST_PROJECT.test(segment);
}

export function isBusinessLogicPath(file: string): boolean {
  return getPathSegments(file).some(segmentMatchesBusinessLogic);
}

export function isTestProjectPath(file: string): boolean {
  return getPathSegments(file).some(segmentMatchesTestProject);
}

export const missingTestsAnalyzer: Analyzer = {
  async run(context: GitContext): Promise<Finding[]> {
    const businessLogicFiles = context.changedFiles.filter(isBusinessLogicPath);
    if (businessLogicFiles.length === 0) {
      return [];
    }

    const hasTestChanges = context.changedFiles.some(isTestProjectPath);
    if (hasTestChanges) {
      return [];
    }

    return [
      {
        severity: 'warning',
        title: 'Business logic changed without tests',
        explanation:
          'Modified business logic in Services, Domain, or Application but no test project files (*.Tests, *.UnitTests, *.IntegrationTests) were changed.',
        file: businessLogicFiles[0],
      },
    ];
  },
};
