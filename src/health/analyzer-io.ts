import fs from 'node:fs/promises';
import path from 'node:path';
import type { RepoContext, RepoFile } from '../models/repo-context.js';

export function logSkip(context: RepoContext, file: RepoFile, reason: string): void {
  context.healthRun?.debug(`Skipped ${file.path}: ${reason}`);
}

export async function readAnalyzerFile(context: RepoContext, file: RepoFile): Promise<string | null> {
  const absolutePath = path.join(context.rootPath, file.path);

  try {
    return await fs.readFile(absolutePath, 'utf8');
  } catch {
    if (context.healthRun && !context.healthRun.readFailures.includes(file.path)) {
      context.healthRun.readFailures.push(file.path);
    }

    context.healthRun?.debug(`Skipped unreadable file: ${file.path}`);
    return null;
  }
}
