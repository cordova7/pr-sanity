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
export { consoleReporter, reportFindings, formatFinding } from './console.reporter.js';
export { terminalReporter } from './terminal.reporter.js';
export { jsonReporter, buildReport, type PrSanityReport } from './json.reporter.js';
