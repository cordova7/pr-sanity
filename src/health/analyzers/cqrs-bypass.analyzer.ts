import { filterFilesByModule, type PrSanityConfig } from '../../config/config.js';
import type { RepoContext, RepoFile } from '../../models/repo-context.js';
import { logSkip, readAnalyzerFile } from '../analyzer-io.js';
import type { HealthAnalyzer, HealthFinding } from '../health-analyzer.interface.js';
import { getSkipCqrsContentReason, getSkipCqrsFileReason } from './should-skip-file.js';

const HANDLER = /:\s*I(?:Request|Command|Query)Handler\s*</;
const PRIVATE_READONLY = /private\s+readonly\s+\w+/;
const DIRECT_CALL = /\.(?:Handle|Execute)\(/;
const CONCRETE_HANDLER_CTOR =
  /\([^)]*\b(?!(?:IMediator|ISender|IRequestHandler|ICommandHandler|IQueryHandler)\b)\w*Handler\b[^)]*\)/;

interface ClassifiedFile {
  path: string;
  module: string;
}

export function isHandlerFile(content: string): boolean {
  return HANDLER.test(content);
}

export function detectCqrsBypass(content: string): boolean {
  if (isHandlerFile(content)) {
    return false;
  }

  const hasDirectServiceCall = PRIVATE_READONLY.test(content) && DIRECT_CALL.test(content);
  const hasConcreteHandlerInjection = CONCRETE_HANDLER_CTOR.test(content);

  return hasDirectServiceCall || hasConcreteHandlerInjection;
}

export function buildCqrsBypassFinding(
  handlerFiles: ClassifiedFile[],
  bypassFiles: ClassifiedFile[],
  threshold = 0.15,
): HealthFinding | null {
  const handlerCount = handlerFiles.length;

  // CQRS bypass rate is only meaningful once the repo has enough handlers to establish a MediatR baseline.
  if (handlerCount < 5) {
    return null;
  }

  const bypassRate = bypassFiles.length / (handlerCount + bypassFiles.length);

  if (bypassRate <= threshold) {
    return null;
  }

  const percentage = Math.round(bypassRate * 100);
  const moduleCounts = new Map<string, number>();

  for (const file of bypassFiles) {
    moduleCounts.set(file.module, (moduleCounts.get(file.module) ?? 0) + 1);
  }

  const topModules = [...moduleCounts.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }

      return a[0].localeCompare(b[0]);
    })
    .slice(0, 3)
    .map(([moduleName]) => moduleName);

  const affectedFiles = bypassFiles
    .map((file) => file.path)
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 8);

  return {
    module: topModules.join(', '),
    tensionType: 'cqrs-bypass',
    severity: bypassRate > 0.35 ? 'critical' : 'warning',
    title: 'MediatR bypass in Application layer',
    detail: `${bypassFiles.length} bypass files vs ${handlerCount} handlers (${percentage}% bypass rate)`,
    affectedFiles,
  };
}

function isApplicationLayer(file: RepoFile): boolean {
  return file.layer === 'Application';
}

export const cqrsBypassAnalyzer: HealthAnalyzer = {
  name: 'cqrs-bypass',

  async run(context: RepoContext, config: PrSanityConfig): Promise<HealthFinding[]> {
    const files = filterFilesByModule(context.files, config);
    const handlerFiles: ClassifiedFile[] = [];
    const bypassFiles: ClassifiedFile[] = [];

    for (const file of files) {
      const pathReason = getSkipCqrsFileReason(file.path);

      if (pathReason !== null) {
        logSkip(context, file, pathReason);
        continue;
      }

      const content = await readAnalyzerFile(context, file);

      if (content === null) {
        continue;
      }

      const contentReason = getSkipCqrsContentReason(content);

      if (contentReason !== null) {
        logSkip(context, file, contentReason);
        continue;
      }

      if (isHandlerFile(content)) {
        handlerFiles.push({
          path: file.path,
          module: file.module,
        });
        continue;
      }

      if (!isApplicationLayer(file)) {
        continue;
      }

      if (detectCqrsBypass(content)) {
        bypassFiles.push({
          path: file.path,
          module: file.module,
        });
      }
    }

    const threshold = config.health?.thresholds?.cqrsBypassRate ?? 0.15;
    const finding = buildCqrsBypassFinding(handlerFiles, bypassFiles, threshold);
    return finding === null ? [] : [finding];
  },
};
