#!/usr/bin/env node
/**
 * Adversarial health analyzer tests — attempts to fool or break pr-sanity.
 *
 * Run: node test/adversarial/adversarial-test.js
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildPersistenceBypassFinding,
  detectPersistenceBypass,
  detectResultPatterns,
} from '../../dist/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const cliPath = path.join(repoRoot, 'bin', 'pr-sanity.js');
const distPath = path.join(repoRoot, 'dist', 'index.js');

function fail(message) {
  console.error(`FAIL: ${message}`);
  return false;
}

function pass(message) {
  console.log(`PASS: ${message}`);
  return true;
}

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, relativePath), 'utf8');
}

function runHealth(repoPath, extraArgs = []) {
  return spawnSync(process.execPath, [cliPath, 'health', '--path', repoPath, '--ci', ...extraArgs], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

function parseStdout(result) {
  try {
    return JSON.parse(result.stdout?.trim() ?? '');
  } catch {
    return null;
  }
}

function testObfuscatedAliases() {
  console.log('\n--- 1. Obfuscated type aliases ---');
  const patterns = detectResultPatterns(read('obfuscated.cs'));
  const hasArdalis = patterns.includes('Ardalis.Result');
  const hasErrorOr = patterns.includes('ErrorOr');

  if (!hasArdalis || !hasErrorOr) {
    return fail(
      `expected both Ardalis.Result and ErrorOr, got ${JSON.stringify(patterns)}`,
    );
  }

  return pass(`detected both patterns via aliases: ${patterns.join(', ')}`);
}

function testBorderline49Percent() {
  console.log('\n--- 2. Borderline 49% persistence bypass ---');

  spawnSync(process.execPath, [path.join(__dirname, 'generate-borderline-fixture.js')], {
    stdio: 'inherit',
  });

  const fixturePath = path.join(__dirname, 'borderline');
  const applicationDir = path.join(fixturePath, 'src', 'Orders', 'Application', 'Services');
  const files = fs.readdirSync(applicationDir).filter((name) => name.endsWith('.cs'));
  const bypassFiles = files.filter((name) => name.startsWith('Bypass'));
  const rate = bypassFiles.length / files.length;

  if (Math.round(rate * 100) !== 49) {
    return fail(`fixture rate is ${Math.round(rate * 100)}%, expected 49%`);
  }

  const finding = buildPersistenceBypassFinding(
    bypassFiles.map((name) => ({
      path: `src/Orders/Application/Services/${name}`,
      module: 'Orders',
    })),
    files.length,
    0.1,
  );

  if (finding === null) {
    return fail('49% bypass did not fire at default threshold 0.1 (10%) — expected tension');
  }

  pass(`threshold is 10% (0.1); 49% is above it → tension fires (${finding.detail})`);
  return true;
}

function testGodClass() {
  console.log('\n--- 3. God class (single file, all patterns) ---');

  const result = runHealth(path.join(__dirname, 'godclass'));
  const summary = parseStdout(result);

  if (summary === null) {
    return fail('could not parse godclass health output');
  }

  const types = new Set((summary.findings ?? []).map((finding) => finding.tensionType));
  const expected = ['result-pattern-inconsistency', 'persistence-bypass', 'validation-strategy-inconsistency'];
  const missing = expected.filter((type) => !types.has(type));

  console.log(`  score=${summary.score}, tensions=${summary.tensionCount}`);
  for (const finding of summary.findings ?? []) {
    console.log(`    [${finding.severity}] ${finding.tensionType}: ${finding.detail}`);
  }

  if (missing.length > 0) {
    return fail(`godclass missing tensions: ${missing.join(', ')}`);
  }

  if (types.has('cqrs-bypass')) {
    return fail('godclass incorrectly reported cqrs-bypass without 5 handlers');
  }

  pass('found result-pattern, persistence-bypass, validation-strategy; CQRS correctly suppressed');
  return true;
}

function testEmptyRepo() {
  console.log('\n--- 4. Empty repo (zero .cs files) ---');

  const emptyPath =
    process.platform === 'win32'
      ? path.join(os.tmpdir(), 'empty-dotnet')
      : '/tmp/empty-dotnet';

  fs.mkdirSync(emptyPath, { recursive: true });
  const result = runHealth(emptyPath);
  const stderr = result.stderr ?? '';
  const stdout = result.stdout ?? '';

  if (result.status !== 0) {
    return fail(`expected exit 0, got ${result.status}`);
  }

  if (!stderr.includes('No .cs files found') && !stdout.includes('No .cs files found')) {
    return fail('expected "No .cs files found" message');
  }

  return pass('exit 0 with "No .cs files found" message');
}

function testLargeRepo() {
  console.log('\n--- 5. Large repo (10,000 files) ---');

  const largePath =
    process.platform === 'win32'
      ? path.join(os.tmpdir(), 'pr-sanity-large-repo')
      : '/tmp/pr-sanity-large-repo';

  const gen = spawnSync(
    process.execPath,
    [path.join(__dirname, 'generate-large-repo.js'), largePath, '10000'],
    { encoding: 'utf8' },
  );

  if (gen.status !== 0) {
    return fail(`generator failed: ${gen.stderr ?? gen.stdout}`);
  }

  const started = performance.now();
  const result = spawnSync(
    process.execPath,
    [
      '--max-old-space-size=512',
      cliPath,
      'health',
      '--path',
      largePath,
      '--ci',
      '--max-files',
      '10000',
    ],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=512' },
    },
  );
  const elapsedSec = (performance.now() - started) / 1000;

  if (result.status !== 0 && result.status !== null) {
    console.error(result.stderr ?? result.stdout);
    return fail(`health crashed with exit ${result.status}`);
  }

  const summary = parseStdout(result);

  if (summary === null) {
    return fail('could not parse large repo health JSON');
  }

  console.log(`  completed in ${elapsedSec.toFixed(1)}s, score=${summary.score}, tensions=${summary.tensionCount}`);

  if (elapsedSec > 30) {
    return fail(`took ${elapsedSec.toFixed(1)}s, expected under 30s`);
  }

  return pass(`10k files scanned in ${elapsedSec.toFixed(1)}s under 512MB heap cap`);
}

function main() {
  if (!fs.existsSync(distPath)) {
    console.error('dist/ not found. Run `npm run build` first.');
    process.exit(1);
  }

  console.log('Adversarial pr-sanity health tests');

  const results = [
    testObfuscatedAliases(),
    testBorderline49Percent(),
    testGodClass(),
    testEmptyRepo(),
    testLargeRepo(),
  ];

  const failed = results.filter((ok) => !ok).length;
  console.log(`\n${results.length - failed}/${results.length} adversarial cases passed`);

  if (failed > 0) {
    process.exit(1);
  }
}

main();
