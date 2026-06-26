import fs from 'node:fs';
import path from 'node:path';
import { load as loadYaml } from 'js-yaml';

export interface PrSanityConfig {
  health?: {
    moduleDepth?: 1 | 2 | 'auto';
    ignore?: {
      modules?: string[];
      tensionTypes?: string[];
    };
    thresholds?: {
      persistenceBypassRate?: number;
      cqrsBypassRate?: number;
    };
    blessed?: {
      resultPattern?: string;
      validationStrategy?: string;
    };
  };
}

const ANALYZER_TENSION_TYPES: Record<string, string> = {
  'result-pattern': 'result-pattern-inconsistency',
  'validation-strategy': 'validation-strategy-inconsistency',
  'persistence-bypass': 'persistence-bypass',
  'cqrs-bypass': 'cqrs-bypass',
};

function normalizeModuleDepth(value: unknown): 1 | 2 | 'auto' | undefined {
  if (value === 1 || value === 2 || value === 'auto') {
    return value;
  }

  return undefined;
}

function normalizeConfig(raw: unknown): PrSanityConfig {
  if (typeof raw !== 'object' || raw === null) {
    return {};
  }

  const value = raw as PrSanityConfig;
  const health = value.health;

  if (health === undefined) {
    return {};
  }

  return {
    health: {
      moduleDepth: normalizeModuleDepth(health.moduleDepth),
      ignore: {
        modules: Array.isArray(health.ignore?.modules) ? health.ignore.modules.map(String) : undefined,
        tensionTypes: Array.isArray(health.ignore?.tensionTypes)
          ? health.ignore.tensionTypes.map(String)
          : undefined,
      },
      thresholds: {
        persistenceBypassRate:
          typeof health.thresholds?.persistenceBypassRate === 'number'
            ? health.thresholds.persistenceBypassRate
            : undefined,
        cqrsBypassRate:
          typeof health.thresholds?.cqrsBypassRate === 'number' ? health.thresholds.cqrsBypassRate : undefined,
      },
      blessed: {
        resultPattern:
          typeof health.blessed?.resultPattern === 'string' ? health.blessed.resultPattern : undefined,
        validationStrategy:
          typeof health.blessed?.validationStrategy === 'string' ? health.blessed.validationStrategy : undefined,
      },
    },
  };
}

export function loadConfig(rootPath: string): PrSanityConfig {
  const configPath = path.join(rootPath, '.pr-sanity.yml');

  if (!fs.existsSync(configPath)) {
    return {};
  }

  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    return normalizeConfig(loadYaml(raw));
  } catch {
    return {};
  }
}

export function isIgnoredModule(module: string, config: PrSanityConfig): boolean {
  const ignoredModules = config.health?.ignore?.modules ?? [];
  return ignoredModules.includes(module);
}

export function isIgnoredAnalyzer(analyzerName: string, config: PrSanityConfig): boolean {
  const ignoredTypes = new Set(config.health?.ignore?.tensionTypes ?? []);
  const tensionType = ANALYZER_TENSION_TYPES[analyzerName];

  return ignoredTypes.has(analyzerName) || (tensionType !== undefined && ignoredTypes.has(tensionType));
}

export function filterFilesByModule<T extends { module: string }>(files: T[], config: PrSanityConfig): T[] {
  return files.filter((file) => !isIgnoredModule(file.module, config));
}
