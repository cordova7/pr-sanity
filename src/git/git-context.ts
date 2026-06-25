import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { GitContext, GitContextOptions } from '../models/git-context.js';

const execFileAsync = promisify(execFile);

async function runGit(args: string[], cwd?: string): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd, maxBuffer: 10 * 1024 * 1024 });
  return stdout.trim();
}

export async function buildGitContext(options: GitContextOptions): Promise<GitContext> {
  const { baseRef, headRef, cwd } = options;

  const mergeBase = await runGit(['merge-base', baseRef, headRef], cwd);
  const diff = await runGit(['diff', `${mergeBase}..${headRef}`], cwd);
  const nameOnly = await runGit(['diff', '--name-only', `${mergeBase}..${headRef}`], cwd);

  const changedFiles = nameOnly
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return {
    baseRef,
    headRef,
    changedFiles,
    diff,
  };
}
