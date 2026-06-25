export interface GitContext {
  baseRef: string;
  headRef: string;
  changedFiles: string[];
  diff?: string;
}

export interface GitContextOptions {
  baseRef: string;
  headRef: string;
  cwd?: string;
}
