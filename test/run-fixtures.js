#!/usr/bin/env node
/**
 * Health analyzer fixture harness.
 *
 * External calibration (manual, optional):
 *   test/fixtures/low-tension     — score 100, 0 tensions
 *   test/fixtures/high-tension    — score <60, 4 tensions
 *   CleanArchitecture (jasontaylordev) — score 75–100, 0–1 tensions
 *   eShopOnWeb (dotnet-architecture)   — score 55–75, 2–4 tensions
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const cliPath = path.join(repoRoot, 'bin', 'pr-sanity.js');
const distPath = path.join(repoRoot, 'dist', 'index.js');
const verbose = process.argv.includes('--verbose');

const fixtures = [
  {
    name: 'high-tension',
    path: path.join(repoRoot, 'test', 'fixtures', 'high-tension'),
    expectedExit: 1,
    exactTensions: 4,
    exactScore: 52,
    requiredFindings: [
      {
        tensionType: 'result-pattern-inconsistency',
        severity: 'critical',
        detailIncludes: 'ErrorOr',
      },
      {
        tensionType: 'persistence-bypass',
        severity: 'critical',
        affectedFilesIncludes: ['src/Billing/Application/Services/DbContextOnlyService.cs'],
      },
      {
        tensionType: 'cqrs-bypass',
        severity: 'critical',
        detailIncludes: '5 handlers',
      },
    ],
  },
  {
    name: 'low-tension',
    path: path.join(repoRoot, 'test', 'fixtures', 'low-tension'),
    expectedExit: 0,
    exactTensions: 0,
    minScore: 86,
    forbiddenTensionTypes: [
      'persistence-bypass',
      'result-pattern-inconsistency',
      'cqrs-bypass',
      'validation-strategy-inconsistency',
    ],
  },
];

function fail(message) {
  console.error(`FAIL: ${message}`);
  return false;
}

function runHealth(fixturePath) {
  return spawnSync(process.execPath, [cliPath, 'health', '--path', fixturePath, '--ci'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

function runHealthArgs(fixturePath, extraArgs) {
  return spawnSync(process.execPath, [cliPath, 'health', '--path', fixturePath, ...extraArgs], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

function parseSummary(result) {
  const stdout = result.stdout?.trim() ?? '';
  if (!stdout) {
    return null;
  }

  try {
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

function findFinding(summary, tensionType) {
  return (summary.findings ?? []).find((finding) => finding.tensionType === tensionType);
}

function assertRequiredFindings(fixture, summary) {
  if (fixture.requiredFindings === undefined) {
    return true;
  }

  let passed = true;

  for (const requirement of fixture.requiredFindings) {
    const finding = findFinding(summary, requirement.tensionType);

    if (finding === undefined) {
      passed = fail(`${fixture.name}: missing required finding ${requirement.tensionType}`);
      continue;
    }

    if (requirement.severity !== undefined && finding.severity !== requirement.severity) {
      passed = fail(
        `${fixture.name}: ${requirement.tensionType} expected severity ${requirement.severity}, got ${finding.severity}`,
      );
    }

    if (
      requirement.detailIncludes !== undefined &&
      !finding.detail.includes(requirement.detailIncludes)
    ) {
      passed = fail(
        `${fixture.name}: ${requirement.tensionType} detail must include ${JSON.stringify(requirement.detailIncludes)}, got ${JSON.stringify(finding.detail)}`,
      );
    }

    if (requirement.affectedFilesIncludes !== undefined) {
      for (const affectedFile of requirement.affectedFilesIncludes) {
        if (!(finding.affectedFiles ?? []).includes(affectedFile)) {
          passed = fail(
            `${fixture.name}: ${requirement.tensionType} affectedFiles must include ${affectedFile}`,
          );
        }
      }
    }
  }

  return passed;
}

function assertFixture(fixture) {
  console.log(`\n--- ${fixture.name} ---`);

  const result = runHealth(fixture.path);
  const summary = parseSummary(result);

  if (summary === null) {
    fail(`${fixture.name}: could not parse JSON from stdout`);
    if (result.stderr) {
      console.error(result.stderr);
    }
    if (result.stdout) {
      console.error('stdout:', result.stdout);
    }
    return false;
  }

  if (verbose) {
    for (const finding of summary.findings ?? []) {
      console.log(`  [${finding.severity}] ${finding.tensionType}: ${finding.detail}`);
    }
  }

  let passed = true;

  console.log(`  exit=${result.status}, score=${summary.score}, tensions=${summary.tensionCount}`);

  if (result.status !== fixture.expectedExit) {
    passed = fail(`${fixture.name}: expected exit ${fixture.expectedExit}, got ${result.status}`);
  }

  if (fixture.exactTensions !== undefined && summary.tensionCount !== fixture.exactTensions) {
    passed = fail(
      `${fixture.name}: expected ${fixture.exactTensions} tensions, got ${summary.tensionCount}`,
    );
  }

  if (fixture.exactScore !== undefined && summary.score !== fixture.exactScore) {
    passed = fail(`${fixture.name}: expected score ${fixture.exactScore}, got ${summary.score}`);
  }

  if (fixture.minTensions !== undefined && summary.tensionCount < fixture.minTensions) {
    passed = fail(
      `${fixture.name}: expected at least ${fixture.minTensions} tensions, got ${summary.tensionCount}`,
    );
  }

  if (fixture.maxScore !== undefined && summary.score > fixture.maxScore) {
    passed = fail(`${fixture.name}: expected score <= ${fixture.maxScore}, got ${summary.score}`);
  }

  if (fixture.minScore !== undefined && summary.score < fixture.minScore) {
    passed = fail(`${fixture.name}: expected score >= ${fixture.minScore}, got ${summary.score}`);
  }

  if (fixture.forbiddenTensionTypes !== undefined) {
    for (const tensionType of fixture.forbiddenTensionTypes) {
      const matched = (summary.findings ?? []).filter((finding) => finding.tensionType === tensionType);

      if (matched.length > 0) {
        passed = fail(
          `${fixture.name}: forbidden tension ${tensionType} detected (${matched[0].detail ?? 'no detail'})`,
        );
      }
    }
  }

  if (!assertRequiredFindings(fixture, summary)) {
    passed = false;
  }

  if (passed) {
    console.log(`PASS: ${fixture.name}`);
  } else if (!verbose) {
    console.error('  summary:', JSON.stringify(summary, null, 2));
  }

  return passed;
}

function assertDriftDetection() {
  const fixturePath = path.join(repoRoot, 'test', 'fixtures', 'high-tension');
  const baselineDir = path.join(fixturePath, '.pr-sanity');

  console.log('\n--- drift-detection ---');

  try {
    const seedResult = runHealthArgs(fixturePath, ['--seed-baseline']);

    if (seedResult.status !== 0) {
      fail('drift-detection: expected exit 0 from --seed-baseline');
      if (seedResult.stderr) {
        console.error(seedResult.stderr);
      }
      return false;
    }

    const ciResult = runHealthArgs(fixturePath, ['--ci']);
    const stdout = ciResult.stdout ?? '';

    if (!stdout.includes('since last scan')) {
      fail('drift-detection: expected CI output to contain "since last scan"');
      console.error('stdout:', stdout);
      return false;
    }

    if (ciResult.status !== 1) {
      fail(`drift-detection: expected exit 1 from --ci, got ${ciResult.status}`);
      return false;
    }

    console.log('  seed exit=0, ci exit=1, baseline diff active');
    console.log('PASS: drift-detection');
    return true;
  } finally {
    fs.rmSync(baselineDir, { recursive: true, force: true });
  }
}

function assertGitHubComment() {
  const fixturePath = path.join(repoRoot, 'test', 'fixtures', 'high-tension');
  const commentPath = path.join(fixturePath, '.pr-sanity', 'health-comment.md');

  console.log('\n--- github-comment ---');

  try {
    const result = runHealthArgs(fixturePath, ['--comment']);

    if (result.status !== 0) {
      fail(`github-comment: expected exit 0, got ${result.status}`);
      if (result.stderr) {
        console.error(result.stderr);
      }
      return false;
    }

    if (!fs.existsSync(commentPath)) {
      fail('github-comment: expected .pr-sanity/health-comment.md to be created');
      return false;
    }

    const contents = fs.readFileSync(commentPath, 'utf8');

    if (!contents.includes('Architecture Health')) {
      fail('github-comment: comment file must contain "Architecture Health"');
      return false;
    }

    console.log('  comment file created with Architecture Health marker');
    console.log('PASS: github-comment');
    return true;
  } finally {
    fs.rmSync(path.join(fixturePath, '.pr-sanity'), { recursive: true, force: true });
  }
}

function runDemo() {
  return spawnSync(process.execPath, [cliPath, 'health', '--demo'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

function assertDemoMode() {
  console.log('\n--- demo ---');

  const result = runDemo();
  const stdout = result.stdout ?? '';

  if (result.status !== 0) {
    fail(`demo: expected exit 0, got ${result.status}`);
    if (result.stderr) {
      console.error(result.stderr);
    }
    return false;
  }

  let passed = true;

  const requiredStrings = [
    'Architecture Drift Report · eShopOnWeb',
    'result pattern',
    'validation',
    'persistence bypass',
    'CQRS bypass',
    'Health Score: 59/100',
    'This is a demo using eShopOnWeb snapshot data.',
    'Run against your repo: pr-sanity health --path /path/to/your/repo',
  ];

  for (const required of requiredStrings) {
    if (!stdout.includes(required)) {
      passed = fail(`demo: stdout must contain ${JSON.stringify(required)}`);
    }
  }

  if (passed) {
    console.log('  exit=0, all demo markers present');
    console.log('PASS: demo');
  } else if (!verbose) {
    console.error('stdout:', stdout);
  }

  return passed;
}

function main() {
  if (!fs.existsSync(distPath)) {
    console.error('dist/ not found. Run `npm run build` first.');
    process.exit(1);
  }

  let allPassed = true;

  for (const fixture of fixtures) {
    if (!assertFixture(fixture)) {
      allPassed = false;
    }
  }

  if (!assertDriftDetection()) {
    allPassed = false;
  }

  if (!assertGitHubComment()) {
    allPassed = false;
  }

  if (!assertDemoMode()) {
    allPassed = false;
  }

  console.log('');
  if (allPassed) {
    console.log('All fixtures passed.');
    process.exit(0);
  }

  console.error('Some fixtures failed.');
  process.exit(1);
}

main();
