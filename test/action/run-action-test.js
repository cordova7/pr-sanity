#!/usr/bin/env node
/**
 * Run GitHub Action tests: act end-to-end when available, mock validation otherwise.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

function hasAct() {
  const result = spawnSync('act', ['--version'], {
    encoding: 'utf8',
    shell: true,
    stdio: 'pipe',
  });

  return result.status === 0;
}

function runMockTest() {
  const result = spawnSync(process.execPath, [path.join(__dirname, 'mock-action-test.js')], {
    cwd: repoRoot,
    stdio: 'inherit',
  });

  process.exit(result.status ?? 1);
}

function runActTest() {
  const scriptPath = path.join(__dirname, 'test-action.sh');
  const result = spawnSync('bash', [scriptPath], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: true,
  });

  process.exit(result.status ?? 1);
}

if (hasAct()) {
  console.log('act found — running end-to-end action test\n');
  runActTest();
} else {
  console.log('act is not installed.');
  console.log('  mac:   brew install act');
  console.log('  other: https://github.com/nektos/act');
  console.log('Running mock action test instead...\n');
  runMockTest();
}
