export interface GitRepositoryInfo {
  root: string;
}

export interface GitDiffOptions {
  baseRef?: string;
  headRef?: string;
}

export interface GitService {
  assertRepository(): Promise<GitRepositoryInfo>;
  getDefaultBranch(): Promise<string>;
  getChangedFiles(options?: GitDiffOptions): Promise<string[]>;
  getDiff(options?: GitDiffOptions): Promise<string>;
}
