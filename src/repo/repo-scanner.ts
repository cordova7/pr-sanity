import fs from 'node:fs/promises';
import path from 'node:path';
import type { PrSanityConfig } from '../config/config.js';
import { inferLayer, type RepoContext, type RepoFile } from '../models/repo-context.js';
import { inferModuleAtDepth, resolveModuleDepth } from './module-inference.js';

const SKIP_SEGMENTS = new Set(['bin', 'obj', '.git', 'node_modules']);

export interface BuildRepoContextOptions {
  config?: PrSanityConfig;
  maxFiles?: number;
  onFileDiscovered?: (count: number) => void;
  onDebug?: (message: string) => void;
}

function normalizePath(file: string): string {
  return file.replace(/\\/g, '/');
}

function shouldSkip(relativePath: string): boolean {
  const segments = normalizePath(relativePath).split('/').filter(Boolean);
  return segments.some((segment) => SKIP_SEGMENTS.has(segment));
}

async function assertRepoRoot(resolvedRoot: string): Promise<void> {
  try {
    const stat = await fs.stat(resolvedRoot);

    if (!stat.isDirectory()) {
      throw new Error(`Path is not a directory: ${resolvedRoot}`);
    }
  } catch (error) {
    const errno = (error as NodeJS.ErrnoException).code;

    if (errno === 'ENOENT') {
      throw new Error(`Repository path does not exist: ${resolvedRoot}`);
    }

    throw error;
  }
}

export async function buildRepoContext(
  rootPath: string,
  options: BuildRepoContextOptions = {},
): Promise<RepoContext> {
  const resolvedRoot = path.resolve(rootPath);
  await assertRepoRoot(resolvedRoot);
  const config = options.config ?? {};
  const moduleDepth = await resolveModuleDepth(resolvedRoot, config);
  const files: RepoFile[] = [];

  async function walk(currentDir: string): Promise<void> {
    let entries;

    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch (error) {
      if (currentDir === resolvedRoot) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`Cannot read repository root (${resolvedRoot}): ${detail}`);
      }

      const relativeDirectory = normalizePath(path.relative(resolvedRoot, currentDir));
      const displayPath = relativeDirectory === '' || relativeDirectory === '.' ? '.' : relativeDirectory;
      options.onDebug?.(`Skipped unreadable directory: ${displayPath}`);
      return;
    }

    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      const relativePath = normalizePath(path.relative(resolvedRoot, absolutePath));

      if (shouldSkip(relativePath)) {
        continue;
      }

      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }

      if (entry.isFile() && entry.name.endsWith('.cs')) {
        files.push({
          path: relativePath,
          module: inferModuleAtDepth(relativePath, moduleDepth),
          layer: inferLayer(relativePath),
        });
        options.onFileDiscovered?.(files.length);
      }
    }
  }

  await walk(resolvedRoot);

  const totalDiscovered = files.length;
  const maxFiles = options.maxFiles ?? Number.POSITIVE_INFINITY;
  const truncated = totalDiscovered > maxFiles;
  const scannedFiles = truncated ? files.slice(0, maxFiles) : files;

  return {
    rootPath: resolvedRoot,
    files: scannedFiles,
    scanMeta: {
      totalDiscovered,
      truncated,
    },
  };
}
