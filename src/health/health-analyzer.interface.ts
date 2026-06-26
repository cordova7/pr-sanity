import type { PrSanityConfig } from '../config/config.js';
import type { RepoContext } from '../models/repo-context.js';

export interface HealthFinding {
  module: string;
  tensionType: string;
  severity: 'critical' | 'warning';
  title: string;
  detail: string;
  affectedFiles?: string[];
}

export interface HealthAnalyzer {
  name: string;
  run(context: RepoContext, config: PrSanityConfig): Promise<HealthFinding[]>;
}
