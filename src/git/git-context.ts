import type { GitContext, GitContextOptions } from '../models/git-context.js';
import { createGitService } from './simple-git.service.js';

export async function buildGitContext(options: GitContextOptions): Promise<GitContext> {
  const git = createGitService(options.cwd);
  await git.assertRepository();

  const changedFiles = await git.getChangedFiles({
    baseRef: options.baseRef,
    headRef: options.headRef,
  });
  const diff = await git.getDiff({
    baseRef: options.baseRef,
    headRef: options.headRef,
  });

  return {
    baseRef: options.baseRef,
    headRef: options.headRef,
    changedFiles,
    diff,
  };
}
