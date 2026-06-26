import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGitContext, createGitService } from './git/index.js';
import { loadConfig } from './config/index.js';
import { analyzerManager } from './analyzers/index.js';
import {
  buildHealthCiSummary,
  buildHealthComment,
  buildHealthHtml,
  calculateHealthScore,
  clusterByModule,
  diffBaseline,
  formatBaselineDeltaPlain,
  healthAnalyzerManager,
  loadBaseline,
  loadBaselineTimeline,
  loadDemoSnapshot,
  printDriftReport,
  printHealthReport,
  resolveRepoName,
  saveBaseline,
  type ModuleTensionSummary,
} from './health/index.js';
import { buildRepoContext } from './repo/index.js';
import { buildReport, getReporter, type ReportFormat } from './reporters/index.js';
import type { Finding } from './models/finding.js';
import type { HealthFinding } from './health/health-analyzer.interface.js';

export interface CheckOptions {
  base: string;
  head: string;
  format: ReportFormat;
  verbose?: boolean;
  maxRisk?: number;
  output?: string;
}

export type HealthReportFormat = 'console' | 'json' | 'html';

export interface HealthOptions {
  path: string;
  format: HealthReportFormat;
  output?: string;
  saveBaseline?: boolean;
  seedBaseline?: boolean;
  ci?: boolean;
  comment?: boolean;
  debugModules?: boolean;
  verbose?: boolean;
  maxFiles?: number;
  demo?: boolean;
}

export interface DriftOptions {
  path: string;
  last: number;
}

function parseLast(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    throw new Error(`Invalid --last value: ${value}`);
  }
  return Math.min(parsed, 12);
}

function parseMaxFiles(value: string): number {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    throw new Error(`Invalid --max-files value: ${value}`);
  }

  return parsed;
}

function printModuleInference(files: { path: string; module: string; layer: string }[]): void {
  for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    console.log(`  ${file.path}  →  module: ${file.module}  layer: ${file.layer}`);
  }
}

function createHealthRunState(verbose: boolean) {
  return {
    verbose,
    readFailures: [] as string[],
    debug(message: string) {
      if (verbose) {
        console.error(message);
      }
    },
  };
}

function printTruncationWarning(totalDiscovered: number, maxFiles: number): void {
  console.error(`Warning: Large repository (${totalDiscovered.toLocaleString()} files).`);
  console.error('Consider using health.ignore.modules in .pr-sanity.yml to scope analysis.');
  console.error(`Continuing with first ${maxFiles.toLocaleString()} files...`);
}

function formatDuration(seconds: number): string {
  return `${seconds.toFixed(1)}s`;
}

function parseMaxRisk(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid max-risk value: ${value}`);
  }
  return parsed;
}

function hasErrors(findings: Finding[]): boolean {
  return findings.some((finding) => finding.severity === 'error');
}

interface HealthReport {
  findings: HealthFinding[];
  moduleSummaries: ModuleTensionSummary[];
}

export async function runCheck(options: CheckOptions): Promise<number> {
  const { base, head, format, verbose, maxRisk, output } = options;

  if (verbose) {
    console.error(`Base: ${base}`);
    console.error(`Head: ${head}`);
    console.error(`Analyzers: ${analyzerManager.list().length}`);
  }

  const context = await buildGitContext({ baseRef: base, headRef: head });
  const findings = await analyzerManager.runAll(context);
  const report = buildReport(findings);
  const reporter = getReporter(format);

  reporter.report(findings);

  if (output) {
    fs.writeFileSync(output, JSON.stringify(report, null, 2), 'utf8');
  }

  if (maxRisk !== undefined && report.risk.score > maxRisk) {
    console.error(`Risk score ${report.risk.score} exceeds --max-risk ${maxRisk}`);
    return 1;
  }

  return hasErrors(findings) ? 1 : 0;
}

function writeHealthHtmlReport(
  findings: HealthFinding[],
  moduleSummaries: ModuleTensionSummary[],
  diff: ReturnType<typeof diffBaseline> | null,
  repoPath: string,
  output?: string,
): string {
  const repoName = resolveRepoName(repoPath);
  const html = buildHealthHtml(findings, moduleSummaries, diff, repoName);
  const htmlPath = output ?? path.join(repoPath, '.pr-sanity', 'health-report.html');
  fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
  fs.writeFileSync(htmlPath, html, 'utf8');
  return htmlPath;
}

export async function runHealth(options: HealthOptions): Promise<number> {
  const {
    format,
    output,
    path: repoPathOption,
    saveBaseline: shouldSaveBaseline,
    seedBaseline,
    ci,
    comment,
    debugModules,
    verbose = false,
    maxFiles = 5000,
    demo = false,
  } = options;

  if (demo) {
    if (ci || seedBaseline || shouldSaveBaseline || debugModules) {
      console.error('Error: --demo cannot be used with --ci, --save-baseline, --seed-baseline, or --debug-modules');
      return 1;
    }

    if (format !== 'console') {
      console.error('Error: --demo only supports console output');
      return 1;
    }

    const snapshot = loadDemoSnapshot();
    const findings = snapshot.findings;
    const moduleSummaries = clusterByModule(findings);

    printHealthReport(findings, moduleSummaries, null, {
      repoPath: '',
      repoName: snapshot.repoName,
      timestamp: snapshot.timestamp,
      demoFooter: true,
    });

    return 0;
  }

  const repoPath = path.resolve(repoPathOption);
  const runStart = performance.now();

  if (ci) {
    chalk.level = 0;
  }

  const baseline = loadBaseline(repoPath);
  const config = loadConfig(repoPath);
  const healthRun = createHealthRunState(verbose);
  const showProgress = !ci && !debugModules && process.stdout.isTTY === true;

  type OraSpinner = {
    text: string;
    start: () => OraSpinner;
    stop: () => OraSpinner;
    succeed: (text?: string) => OraSpinner;
  };

  let spinner: OraSpinner | null = null;

  if (showProgress) {
    const { default: ora } = await import('ora');
    spinner = ora('Scanning repository...').start();
  }

  const context = await buildRepoContext(repoPath, {
    config,
    maxFiles,
    onFileDiscovered: (count) => {
      if (spinner !== null) {
        spinner.text = `Scanning repository... ${count} files found`;
      }
    },
    onDebug: (message) => {
      healthRun.debug(message);
    },
  });

  context.healthRun = healthRun;

  if (context.scanMeta?.truncated) {
    printTruncationWarning(context.scanMeta.totalDiscovered, maxFiles);
  }

  if (spinner !== null) {
    if (context.files.length > 100) {
      spinner.succeed(`Scanning repository... ${context.files.length} files found`);
    } else {
      spinner.stop();
    }

    spinner = null;
  }

  if (debugModules) {
    printModuleInference(context.files);
    return 0;
  }

  if (context.files.length === 0) {
    console.error(`No .cs files found under ${repoPath}`);
    console.error('Ensure --path points to the repository root (the folder containing src/ or a .sln file).');
    return 0;
  }

  if (verbose) {
    printModuleInference(context.files);
  }

  const useAnalyzerProgress = showProgress && context.files.length > 100;

  const findings = await healthAnalyzerManager.runAll(context, config, {
    onAnalyzerStart: (label) => {
      if (useAnalyzerProgress) {
        console.log(label);
      }
    },
    onAnalyzerComplete: (name, durationMs) => {
      if (verbose) {
        healthRun.debug(`${name} took ${durationMs}ms`);
      }
    },
  });

  if (useAnalyzerProgress) {
    const elapsedSeconds = (performance.now() - runStart) / 1000;
    console.log(`Done in ${formatDuration(elapsedSeconds)}`);
  }

  const moduleSummaries = clusterByModule(findings);
  const diff = baseline !== null ? diffBaseline(findings, baseline) : null;
  const report: HealthReport = { findings, moduleSummaries };
  const hasCritical = findings.some((finding) => finding.severity === 'critical');

  if (comment) {
    const score = calculateHealthScore(findings);
    const markdown = buildHealthComment(findings, moduleSummaries, score, diff);
    const commentPath = path.join(repoPath, '.pr-sanity', 'health-comment.md');
    fs.mkdirSync(path.dirname(commentPath), { recursive: true });
    fs.writeFileSync(commentPath, markdown, 'utf8');
    const logPath = ci ? console.error.bind(console) : console.log.bind(console);
    logPath(commentPath);
  }

  if (ci) {
    const summary = buildHealthCiSummary(findings, moduleSummaries);

    if (diff !== null) {
      summary.sinceLastScan = formatBaselineDeltaPlain(diff);
    }

    console.log(JSON.stringify(summary));

    if (format === 'html') {
      writeHealthHtmlReport(findings, moduleSummaries, diff, repoPath, output);
    }
  } else if (format === 'json') {
    console.log(JSON.stringify(report, null, 2));
    if (output) {
      fs.writeFileSync(output, JSON.stringify(report, null, 2), 'utf8');
    }
  } else if (format === 'html') {
    const htmlPath = writeHealthHtmlReport(findings, moduleSummaries, diff, repoPath, output);
    console.log(htmlPath);
  } else {
    printHealthReport(findings, moduleSummaries, diff, { repoPath });
  }

  if (seedBaseline) {
    saveBaseline(findings, repoPath);
    const score = calculateHealthScore(findings);
    console.log(`Baseline saved · ${findings.length} tensions · score ${score}`);
    console.log('Run `pr-sanity health` to detect drift from this point.');
    return 0;
  }

  if (shouldSaveBaseline) {
    saveBaseline(findings, repoPath);
  }

  return ci && hasCritical ? 1 : 0;
}

export function runDrift(options: DriftOptions): number {
  const repoPath = path.resolve(options.path);
  const snapshots = loadBaselineTimeline(repoPath, options.last);

  if (snapshots.length < 2) {
    console.log('Not enough history yet. Run `pr-sanity health` a few more times.');
    return 0;
  }

  printDriftReport(snapshots, { repoPath, last: options.last });
  return 0;
}

export async function runStatus(): Promise<number> {
  const git = createGitService();
  await git.assertRepository();

  const defaultBranch = await git.getDefaultBranch();
  const changedFiles = await git.getChangedFiles();

  console.log(`Default Branch: ${defaultBranch}\n`);
  console.log('Changed Files:');
  for (const file of changedFiles) {
    console.log(`- ${file}`);
  }

  return 0;
}

function handleCliError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exit(1);
}

export function createProgram(): Command {
  const program = new Command();

  program.name('pr-sanity').description('Sanity checks for pull requests').version('0.1.1');

  program
    .command('check')
    .description('Run PR sanity analyzers against a git diff')
    .option('--base <ref>', 'base ref to compare against', 'origin/main')
    .option('-H, --head <ref>', 'head ref to analyze', 'HEAD')
    .option('--format <type>', 'output format (console | json)', 'console')
    .option('--max-risk <score>', 'exit with code 1 when risk score exceeds this value', parseMaxRisk)
    .option('--output <file>', 'write JSON report (findings + risk) to file')
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
        handleCliError(error);
      }
    });

  program
    .command('health')
    .description('Run repository health analyzers against a full snapshot')
    .option('--path <dir>', 'repository root to scan', process.cwd())
    .option('--format <type>', 'output format (console | json | html)', 'console')
    .option('--output <file>', 'write report to file (json or html)')
    .option('--save-baseline', 'persist scan results to .pr-sanity/baseline.json')
    .option('--seed-baseline', 'run health scan, save baseline, exit 0')
    .option('--ci', 'CI mode: no color, JSON stdout, fail on critical')
    .option('--comment', 'write GitHub PR comment markdown to .pr-sanity/health-comment.md')
    .option('--debug-modules', 'print inferred module per file; skip analyzers')
    .option('--verbose', 'show file-level debug output, skip reasons, module inference, analyzer timing')
    .option('--max-files <n>', 'max .cs files to analyze', parseMaxFiles, 5000)
    .option('--demo', 'run against bundled eShopOnWeb snapshot (no repo required)')
    .action(async (options: HealthOptions) => {
      const format = options.format as HealthReportFormat;
      if (format !== 'console' && format !== 'json' && format !== 'html') {
        console.error(`Invalid format: ${options.format}. Use "console", "json", or "html".`);
        process.exit(1);
      }

      if (options.ci && options.seedBaseline) {
        console.error('Error: --seed-baseline cannot be used with --ci');
        process.exit(1);
      }

      try {
        const exitCode = await runHealth({ ...options, format });
        process.exit(exitCode);
      } catch (error) {
        handleCliError(error);
      }
    });

  program
    .command('drift')
    .description('Show architecture drift trend history')
    .option('--path <dir>', 'repository root to scan', process.cwd())
    .option('--last <n>', 'number of scans to show', parseLast, 8)
    .action((options: DriftOptions) => {
      try {
        const exitCode = runDrift(options);
        process.exit(exitCode);
      } catch (error) {
        handleCliError(error);
      }
    });

  program.action(async () => {
    try {
      const exitCode = await runStatus();
      process.exit(exitCode);
    } catch (error) {
      handleCliError(error);
    }
  });

  return program;
}

const isCliEntry =
  process.argv[1] !== undefined &&
  !process.argv[1].endsWith('index.ts') &&
  !process.argv[1].endsWith('index.js') &&
  (process.argv[1].endsWith('cli.ts') ||
    process.argv[1].endsWith('cli.js') ||
    path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url)));

if (isCliEntry) {
  createProgram().parse(process.argv);
}
