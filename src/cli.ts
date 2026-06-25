import { Command } from 'commander';
import { buildGitContext } from './git/index.js';
import { listAnalyzers, runAnalyzers } from './analyzers/index.js';
import { getReporter, type ReportFormat } from './reporters/index.js';
import type { Finding } from './models/finding.js';

export interface CheckOptions {
  base: string;
  head: string;
  format: ReportFormat;
  analyzer?: string[];
  verbose?: boolean;
}

function hasErrors(findings: Finding[]): boolean {
  return findings.some((finding) => finding.severity === 'error');
}

export async function runCheck(options: CheckOptions): Promise<number> {
  const { base, head, format, analyzer: analyzerIds, verbose } = options;

  if (verbose) {
    console.error(`Base: ${base}`);
    console.error(`Head: ${head}`);
    console.error(`Analyzers: ${(analyzerIds ?? listAnalyzers().map((a) => a.id)).join(', ')}`);
  }

  const context = await buildGitContext({ baseRef: base, headRef: head });
  const results = await runAnalyzers(context, analyzerIds);
  const reporter = getReporter(format);

  reporter.report(results);

  const allFindings = results.flatMap((result) => result.findings);
  return hasErrors(allFindings) ? 1 : 0;
}

export function createProgram(): Command {
  const program = new Command();

  program
    .name('pr-sanity')
    .description('Sanity checks for pull requests')
    .version('0.1.0');

  program
    .command('check')
    .description('Run PR sanity analyzers against a git diff')
    .option('--base <ref>', 'base ref to compare against', 'origin/main')
    .option('--head <ref>', 'head ref to analyze', 'HEAD')
    .option('--format <type>', 'output format (console | json)', 'console')
    .option('--analyzer <id>', 'run only the specified analyzer (repeatable)', (value, prev: string[]) => {
      prev.push(value);
      return prev;
    }, [] as string[])
    .option('--verbose', 'print debug information to stderr')
    .action(async (options: CheckOptions) => {
      const format = options.format as ReportFormat;
      if (format !== 'console' && format !== 'json') {
        console.error(`Invalid format: ${options.format}. Use "console" or "json".`);
        process.exit(1);
      }

      try {
        const exitCode = await runCheck({ ...options, format });
        process.exit(exitCode);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    });

  program
    .command('list')
    .description('List registered analyzers')
    .action(() => {
      for (const analyzer of listAnalyzers()) {
        console.log(`${analyzer.id}\t${analyzer.description}`);
      }
    });

  return program;
}

const isMain =
  process.argv[1] !== undefined &&
  (process.argv[1].endsWith('cli.ts') || process.argv[1].endsWith('cli.js'));

if (isMain) {
  createProgram().parse(process.argv);
}
