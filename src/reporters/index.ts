import type { Reporter } from './types.js';
import { consoleReporter } from './console.reporter.js';
import { jsonReporter } from './json.reporter.js';

export type ReportFormat = 'console' | 'json';

const reporters: Record<ReportFormat, Reporter> = {
  console: consoleReporter,
  json: jsonReporter,
};

export function getReporter(format: ReportFormat): Reporter {
  return reporters[format];
}

export type { Reporter } from './types.js';
export { consoleReporter } from './console.reporter.js';
export { jsonReporter } from './json.reporter.js';
