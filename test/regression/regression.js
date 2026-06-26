#!/usr/bin/env node
/**
 * Regression tests against real public .NET repositories.
 *
 * Slow — clones large repos on first run. Not part of default CI.
 *
 * Run: node test/regression/regression.js
 *      npm run test:regression
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const cliPath = path.join(repoRoot, 'bin', 'pr-sanity.js');
const distPath = path.join(repoRoot, 'dist', 'index.js');
const snapshotsDir = path.join(__dirname, 'snapshots');

const SCORE_DRIFT_THRESHOLD = 10;

const TENSION_LABELS = {
  'persistence-bypass': 'persistence bypass',
  'cqrs-bypass': 'CQRS bypass',
  'result-pattern-inconsistency': 'result pattern',
  'validation-strategy-inconsistency': 'validation',
};

/** @typedef {{ maxTensions?: number, minTensions?: number, minScore?: number, maxScore?: number, scoreRange?: [number, number], mustNotFind?: string[] }} RepoExpect */

/** @typedef {{ name: string, url: string, path: string, expect: RepoExpect }} RegressionRepo */

/** @type {RegressionRepo[]} */
const REPOS = [
  {
    name: 'CleanArchitecture',
    url: 'https://github.com/jasontaylordev/CleanArchitecture',
    path: '/tmp/regression-clean-arch',
    expect: {
      maxTensions: 1,
      minScore: 80,
      mustNotFind: ['persistence bypass', 'CQRS bypass'],
    },
  },
  {
    name: 'eShopOnWeb',
    url: 'https://github.com/dotnet-architecture/eShopOnWeb',
    path: '/tmp/regression-eshoponweb',
    expect: {
      minTensions: 1,
      maxScore: 90,
      scoreRange: [50, 85],
    },
  },
  {
    name: 'NorthwindTraders',
    url: 'https://github.com/jasontaylordev/NorthwindTraders',
    path: '/tmp/regression-northwind',
    expect: {
      scoreRange: [55, 85],
      minTensions: 0,
    },
  },
];

function fail(message) {
  console.error(`FAIL: ${message}`);
  return false;
}

function resolveRepoPath(configuredPath) {
  if (process.platform === 'win32' && configuredPath.startsWith('/tmp/')) {
    return path.join(os.tmpdir(), configuredPath.slice('/tmp/'.length));
  }

  return configuredPath;
}

function runCommand(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'pipe',
    ...options,
  });
}

function ensureRepo(repo) {
  const repoPath = resolveRepoPath(repo.path);

  if (fs.existsSync(path.join(repoPath, '.git'))) {
    console.log(`  using existing clone: ${repoPath}`);
    return repoPath;
  }

  console.log(`  cloning ${repo.url} → ${repoPath}`);
  fs.mkdirSync(path.dirname(repoPath), { recursive: true });

  const cloneResult = runCommand('git', ['clone', '--depth', '1', repo.url, repoPath], { shell: true });

  if (cloneResult.status !== 0) {
    throw new Error(
      `git clone failed for ${repo.name}\n${cloneResult.stderr ?? cloneResult.stdout ?? ''}`,
    );
  }

  return repoPath;
}

function parseHealthJson(stdout) {
  const trimmed = stdout.trim();

  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function findingMatchesTerm(finding, term) {
  const needle = term.toLowerCase();
  const title = finding.title?.toLowerCase() ?? '';
  const tensionType = finding.tensionType?.toLowerCase() ?? '';
  const label = TENSION_LABELS[finding.tensionType]?.toLowerCase() ?? '';

  return title.includes(needle) || tensionType.includes(needle) || label.includes(needle);
}

function assertExpect(repo, summary) {
  const { expect } = repo;
  let passed = true;

  if (expect.maxTensions !== undefined && summary.tensionCount > expect.maxTensions) {
    passed = fail(
      `${repo.name}: tensionCount ${summary.tensionCount} exceeds maxTensions ${expect.maxTensions}`,
    );
  }

  if (expect.minTensions !== undefined && summary.tensionCount < expect.minTensions) {
    passed = fail(
      `${repo.name}: tensionCount ${summary.tensionCount} below minTensions ${expect.minTensions}`,
    );
  }

  if (expect.minScore !== undefined && summary.score < expect.minScore) {
    passed = fail(`${repo.name}: score ${summary.score} below minScore ${expect.minScore}`);
  }

  if (expect.maxScore !== undefined && summary.score > expect.maxScore) {
    passed = fail(`${repo.name}: score ${summary.score} above maxScore ${expect.maxScore}`);
  }

  if (expect.scoreRange !== undefined) {
    const [min, max] = expect.scoreRange;

    if (summary.score < min || summary.score > max) {
      passed = fail(`${repo.name}: score ${summary.score} outside range [${min}, ${max}]`);
    }
  }

  if (expect.mustNotFind !== undefined) {
    for (const term of expect.mustNotFind) {
      const matched = (summary.findings ?? []).filter((finding) => findingMatchesTerm(finding, term));

      if (matched.length > 0) {
        passed = fail(
          `${repo.name}: mustNotFind ${JSON.stringify(term)} but found ${matched[0].title ?? matched[0].tensionType}`,
        );
      }
    }
  }

  return passed;
}

function loadSnapshot(name) {
  const snapshotPath = path.join(snapshotsDir, `${name}.json`);

  if (!fs.existsSync(snapshotPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  } catch {
    return null;
  }
}

function saveSnapshot(name, summary) {
  fs.mkdirSync(snapshotsDir, { recursive: true });
  const snapshotPath = path.join(snapshotsDir, `${name}.json`);
  fs.writeFileSync(snapshotPath, JSON.stringify(summary, null, 2), 'utf8');
  return snapshotPath;
}

function warnScoreDrift(repo, previous, current) {
  if (previous === null || typeof previous.score !== 'number') {
    return;
  }

  const delta = Math.abs(current.score - previous.score);

  if (delta > SCORE_DRIFT_THRESHOLD) {
    console.warn(
      `⚠ Score changed significantly: ${repo.name} was ${previous.score}, now ${current.score}`,
    );
    console.warn('  This could mean a false positive was introduced. Review the diff.');
  }
}

function runHealthScan(repo, repoPath) {
  const tempOutput = path.join(
    os.tmpdir(),
    `pr-sanity-regression-${repo.name.toLowerCase()}-health.json`,
  );

  const result = runCommand(process.execPath, [
    cliPath,
    'health',
    '--path',
    repoPath,
    '--ci',
    '--format',
    'json',
    '--output',
    tempOutput,
  ]);

  let summary = parseHealthJson(result.stdout ?? '');

  if (summary === null && fs.existsSync(tempOutput)) {
    try {
      summary = JSON.parse(fs.readFileSync(tempOutput, 'utf8'));
    } catch {
      summary = null;
    }
  }

  if (summary === null) {
    throw new Error(
      `${repo.name}: could not parse health JSON\nstdout: ${result.stdout ?? ''}\nstderr: ${result.stderr ?? ''}`,
    );
  }

  return { summary, exitCode: result.status ?? 1 };
}

function runRegressionRepo(repo) {
  console.log(`\n--- ${repo.name} ---`);

  const repoPath = ensureRepo(repo);
  const previousSnapshot = loadSnapshot(repo.name);
  const { summary, exitCode } = runHealthScan(repo, repoPath);

  console.log(
    `  exit=${exitCode}, score=${summary.score}, tensions=${summary.tensionCount}, critical=${summary.criticalCount ?? 0}`,
  );

  if (verboseFindings(summary)) {
    for (const finding of summary.findings ?? []) {
      console.log(`    [${finding.severity}] ${finding.title}: ${finding.detail ?? ''}`);
    }
  }

  warnScoreDrift(repo, previousSnapshot, summary);

  const snapshotPath = saveSnapshot(repo.name, summary);
  console.log(`  snapshot: ${snapshotPath}`);

  return assertExpect(repo, summary);
}

function verboseFindings(summary) {
  return process.argv.includes('--verbose') && (summary.findings?.length ?? 0) > 0;
}

function main() {
  if (!fs.existsSync(distPath)) {
    console.error('dist/ not found. Run `npm run build` first.');
    process.exit(1);
  }

  console.log('pr-sanity regression tests (public .NET repositories)');

  let allPassed = true;

  for (const repo of REPOS) {
    try {
      if (!runRegressionRepo(repo)) {
        allPassed = false;
      }
    } catch (error) {
      allPassed = false;
      fail(error instanceof Error ? error.message : String(error));
    }
  }

  console.log('');

  if (allPassed) {
    console.log('All regression repos passed.');
    process.exit(0);
  }

  console.error('Some regression repos failed.');
  process.exit(1);
}

main();
