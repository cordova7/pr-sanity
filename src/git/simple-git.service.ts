import { simpleGit, type SimpleGit } from 'simple-git';
import type { GitDiffOptions, GitRepositoryInfo, GitService } from './types.js';

function parseRemoteHeadRef(symbolicRef: string): string {
  const trimmed = symbolicRef.trim();
  const prefix = 'refs/remotes/origin/';
  if (trimmed.startsWith(prefix)) {
    return trimmed.slice(prefix.length);
  }
  const parts = trimmed.split('/');
  return parts[parts.length - 1] ?? trimmed;
}

async function refExists(git: SimpleGit, ref: string): Promise<boolean> {
  try {
    await git.revparse(['--verify', ref]);
    return true;
  } catch {
    return false;
  }
}

async function resolveRefs(
  git: SimpleGit,
  options?: GitDiffOptions,
): Promise<{ baseRef: string; headRef: string }> {
  const headRef = options?.headRef ?? 'HEAD';

  if (options?.baseRef) {
    return { baseRef: options.baseRef, headRef };
  }

  const defaultBranch = await getDefaultBranch(git);
  const baseRef = await resolveBaseRef(git, defaultBranch);
  return { baseRef, headRef };
}

async function resolveBaseRef(git: SimpleGit, branch: string): Promise<string> {
  if (await refExists(git, `origin/${branch}`)) {
    return `origin/${branch}`;
  }

  if (await refExists(git, branch)) {
    return branch;
  }

  throw new Error(`Could not resolve base ref for branch: ${branch}`);
}

function createGitServiceFromInstance(git: SimpleGit): GitService {
  return {
    assertRepository: () => assertRepository(git),
    getDefaultBranch: () => getDefaultBranch(git),
    getChangedFiles: (options) => getChangedFiles(git, options),
    getDiff: (options) => getDiff(git, options),
  };
}

async function assertRepository(git: SimpleGit): Promise<GitRepositoryInfo> {
  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    throw new Error('Not a git repository');
  }

  const root = (await git.revparse(['--show-toplevel'])).trim();
  return { root };
}

async function getDefaultBranch(git: SimpleGit): Promise<string> {
  try {
    const symbolicRef = await git.raw(['symbolic-ref', 'refs/remotes/origin/HEAD']);
    const branch = parseRemoteHeadRef(symbolicRef);
    if (branch.length > 0) {
      return branch;
    }
  } catch {
    // Fall through to origin/main or origin/master checks.
  }

  if (await refExists(git, 'origin/main')) {
    return 'main';
  }

  if (await refExists(git, 'origin/master')) {
    return 'master';
  }

  if (await refExists(git, 'main')) {
    return 'main';
  }

  if (await refExists(git, 'master')) {
    return 'master';
  }

  throw new Error(
    'Could not determine default branch (tried origin/HEAD, origin/main, origin/master, main, master)',
  );
}

async function getMergeBase(git: SimpleGit, baseRef: string, headRef: string): Promise<string> {
  return (await git.raw(['merge-base', baseRef, headRef])).trim();
}

function parseChangedFiles(output: string): string[] {
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

async function getChangedFiles(git: SimpleGit, options?: GitDiffOptions): Promise<string[]> {
  const { baseRef, headRef } = await resolveRefs(git, options);
  const mergeBase = await getMergeBase(git, baseRef, headRef);
  const output = await git.diff(['--name-only', `${mergeBase}..${headRef}`]);
  return parseChangedFiles(output);
}

async function getDiff(git: SimpleGit, options?: GitDiffOptions): Promise<string> {
  const { baseRef, headRef } = await resolveRefs(git, options);
  const mergeBase = await getMergeBase(git, baseRef, headRef);
  return git.diff([`${mergeBase}..${headRef}`]);
}

export function createGitService(cwd?: string): GitService {
  const git = simpleGit(cwd);
  return createGitServiceFromInstance(git);
}
