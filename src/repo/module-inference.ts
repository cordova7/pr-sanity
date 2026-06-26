import fs from 'node:fs/promises';
import path from 'node:path';
import type { PrSanityConfig } from '../config/config.js';

export const GENERIC_FOLDERS = [
  'web',
  'api',
  'host',
  'server',
  'infrastructure',
  'application',
  'applicationcore',
  'core',
  'shared',
  'common',
  'src',
  'lib',
  'internal',
  'blazoradmin',
  'blazorshared',
  'publicapi',
] as const;

const SKIP_SEGMENTS = new Set(['bin', 'obj', '.git', 'node_modules']);
const GENERIC_FOLDER_SET = new Set(GENERIC_FOLDERS.map((name) => name.toLowerCase()));
const MAX_DEPTH2_MODULES = 40;

function countsTowardDepth2Limit(name: string): boolean {
  return !name.endsWith('Endpoints');
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function getPathSegments(filePath: string): string[] {
  return normalizePath(filePath).split('/').filter(Boolean);
}

function isGenericFolder(name: string): boolean {
  return GENERIC_FOLDER_SET.has(name.toLowerCase());
}

function inferFeatureModule(segments: string[]): string | null {
  const featuresIndex = segments.indexOf('Features');

  if (featuresIndex >= 0 && segments.length > featuresIndex + 1) {
    return segments[featuresIndex + 1];
  }

  return null;
}

function inferEntityModule(segments: string[]): string | null {
  const entitiesIndex = segments.indexOf('Entities');

  if (entitiesIndex < 0 || segments.length <= entitiesIndex + 1) {
    return null;
  }

  const nextSegment = segments[entitiesIndex + 1];

  if (/\.cs$/i.test(nextSegment)) {
    return nextSegment.replace(/\.cs$/i, '');
  }

  return nextSegment.replace(/Aggregate$/, '');
}

function inferEndpointModule(segments: string[]): string | null {
  const endpointSegment = segments.find((segment) => segment.endsWith('Endpoints'));

  if (endpointSegment === undefined) {
    return null;
  }

  return endpointSegment.replace(/Endpoints$/, '');
}

function isFileSegment(segment: string): boolean {
  return /\.(cshtml\.cs|cs)$/i.test(segment);
}

function stripFileExtension(segment: string): string {
  return segment.replace(/\.(cshtml\.cs|cs)$/i, '');
}

function inferProjectModule(segments: string[]): string | null {
  const srcIndex = segments.indexOf('src');

  if (srcIndex >= 0 && segments.length > srcIndex + 1) {
    return segments[srcIndex + 1];
  }

  const testsIndex = segments.indexOf('tests');

  if (testsIndex >= 0 && segments.length > testsIndex + 1) {
    return segments[testsIndex + 1];
  }

  return null;
}

const PROJECT_ROOT_FILE_NAMES = new Set(['Program', 'Dependencies', 'Constants', 'Startup']);

function resolveDepthModule(segments: string[], depth: 1 | 2): string {
  const srcIndex = segments.indexOf('src');
  const moduleIndex = srcIndex >= 0 ? srcIndex + depth : depth - 1;
  const raw = segments[moduleIndex] ?? 'Unknown';

  if (!isFileSegment(raw)) {
    return raw;
  }

  const baseName = stripFileExtension(raw);
  const project = inferProjectModule(segments);

  if (project !== null && PROJECT_ROOT_FILE_NAMES.has(baseName)) {
    return project;
  }

  return baseName;
}

async function listChildDirectories(directoryPath: string): Promise<string[]> {
  let entries;

  try {
    entries = await fs.readdir(directoryPath, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.isDirectory() && !SKIP_SEGMENTS.has(entry.name))
    .map((entry) => entry.name);
}

async function getModuleBasePath(rootPath: string): Promise<string> {
  const resolvedRoot = path.resolve(rootPath);
  const srcPath = path.join(resolvedRoot, 'src');

  try {
    const srcStat = await fs.stat(srcPath);
    if (srcStat.isDirectory()) {
      return srcPath;
    }
  } catch {
    // fall through to repo root
  }

  return resolvedRoot;
}

async function resolveAutoModuleDepth(rootPath: string): Promise<1 | 2> {
  const basePath = await getModuleBasePath(rootPath);
  const level1Names = await listChildDirectories(basePath);

  if (level1Names.length === 0) {
    return 1;
  }

  if (!level1Names.every(isGenericFolder)) {
    return 1;
  }

  const level2Names = new Set<string>();

  for (const level1Name of level1Names) {
    const level2Dirs = await listChildDirectories(path.join(basePath, level1Name));

    for (const level2Name of level2Dirs) {
      if (countsTowardDepth2Limit(level2Name)) {
        level2Names.add(level2Name);
      }
    }
  }

  if (level2Names.size > MAX_DEPTH2_MODULES) {
    return 1;
  }

  return 2;
}

export async function resolveModuleDepth(rootPath: string, config: PrSanityConfig): Promise<1 | 2> {
  const configuredDepth = config.health?.moduleDepth;

  if (configuredDepth === 1 || configuredDepth === 2) {
    return configuredDepth;
  }

  return resolveAutoModuleDepth(rootPath);
}

export function inferModuleAtDepth(relativePath: string, depth: 1 | 2): string {
  const segments = getPathSegments(relativePath);

  const featureModule = inferFeatureModule(segments);

  if (featureModule !== null) {
    return featureModule;
  }

  const entityModule = inferEntityModule(segments);

  if (entityModule !== null) {
    return entityModule;
  }

  const endpointModule = inferEndpointModule(segments);

  if (endpointModule !== null) {
    return endpointModule;
  }

  return resolveDepthModule(segments, depth);
}
