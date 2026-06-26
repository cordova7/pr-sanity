#!/usr/bin/env node
/**
 * Mutation testing for health analyzers.
 *
 * Applies targeted bugs one at a time, runs test/run-fixtures.js, and checks
 * whether the fixture suite catches each mutation.
 *
 * Run: node test/mutation/mutation-test.js
 * Requires: npm run build once beforehand (script rebuilds after each mutation)
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const analyzersDir = path.join(repoRoot, 'src', 'health', 'analyzers');
const fixturesScript = path.join(repoRoot, 'test', 'run-fixtures.js');
const distPath = path.join(repoRoot, 'dist', 'index.js');

/** @typedef {{ file: string, name: string, apply: (content: string) => string, gapHint?: string }} Mutation */

/** @type {Mutation[]} */
const mutations = [
  {
    file: 'persistence-bypass.analyzer.ts',
    name: 'persistence-bypass: default threshold 0.10 → 0.99',
    apply: (content) =>
      content
        .replace('threshold = 0.1,', 'threshold = 0.99,')
        .replace('?? 0.1;', '?? 0.99;'),
    gapHint:
      'high-tension maxScore (59) should fail when persistence-bypass tension disappears (+12 score).',
  },
  {
    file: 'persistence-bypass.analyzer.ts',
    name: 'persistence-bypass: remove Application-layer gate (scan all layers)',
    apply: (content) =>
      content
        .replace(
          `function isApplicationLayer(file: RepoFile): boolean {
  return file.layer === 'Application';
}`,
          `function isApplicationLayer(_file: RepoFile): boolean {
  return true; // mutation: was Application-only
}`,
        )
        .replace(
          "      if (file.layer !== 'Application') {\n        continue;\n      }\n\n      ",
          '      ',
        ),
    gapHint:
      'low-tension forbids persistence-bypass tension type; Infrastructure InvoiceService uses _context.',
  },
  {
    file: 'persistence-bypass.analyzer.ts',
    name: "persistence-bypass: DbContext → DbContext_typo in detection regexes",
    apply: (content) => content.replaceAll('\\bDbContext\\b', '\\bDbContext_typo\\b'),
    gapHint:
      'Fixtures still match via _context., .Set<, and DbSet< heuristics — DbContext regex typo alone is insufficient.',
  },
  {
    file: 'result-pattern.analyzer.ts',
    name: 'result-pattern: minimum pattern count 2 → 99',
    apply: (content) => content.replace('if (patternCounts.size < 2)', 'if (patternCounts.size < 99)'),
    gapHint:
      'high-tension result-pattern-inconsistency should vanish; maxScore assertion should fail.',
  },
  {
    file: 'result-pattern.analyzer.ts',
    name: 'result-pattern: remove ErrorOr detection branch',
    apply: (content) =>
      content.replace(
        `  const hasErrorOr =
    scannable.includes('ErrorOr<') ||
    scannable.includes('using ErrorOr') ||
    /using\\s+\\w+\\s*=\\s*ErrorOr\\b/.test(scannable);

  if (hasErrorOr) {
    patterns.push('ErrorOr');
  }`,
        '  // mutation: ErrorOr detection removed',
      ),
    gapHint:
      'high-tension requiredFindings detail must include ErrorOr and exactScore 52.',
  },
  {
    file: 'cqrs-bypass.analyzer.ts',
    name: 'cqrs-bypass: minimum handler count 5 → 999',
    apply: (content) => content.replace('if (handlerCount < 5)', 'if (handlerCount < 999)'),
    gapHint:
      'high-tension has 5 handlers; cqrs-bypass finding should disappear and fail maxScore.',
  },
];

function runCommand(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'pipe',
    ...options,
  });
}

function npmBuild() {
  return runCommand('npm', ['run', 'build'], { shell: true });
}

function runFixtureSuite() {
  return runCommand(process.execPath, [fixturesScript]);
}

function restoreFile(relativePath, originalContent) {
  const absolutePath = path.join(repoRoot, relativePath);
  fs.writeFileSync(absolutePath, originalContent, 'utf8');
  runCommand('git', ['checkout', '--', relativePath]);
}

function relativeAnalyzerPath(fileName) {
  return path.posix.join('src/health/analyzers', fileName);
}

function runMutation(mutation) {
  const relativePath = relativeAnalyzerPath(mutation.file);
  const absolutePath = path.join(repoRoot, relativePath);
  const originalContent = fs.readFileSync(absolutePath, 'utf8');

  try {
    const mutated = mutation.apply(originalContent);

    if (mutated === originalContent) {
      return {
        name: mutation.name,
        status: 'error',
        reason: 'mutation apply() made no changes — pattern may be stale',
        gapHint: mutation.gapHint,
      };
    }

    fs.writeFileSync(absolutePath, mutated, 'utf8');

    const buildResult = npmBuild();
    if (buildResult.status !== 0) {
      return {
        name: mutation.name,
        status: 'error',
        reason: `build failed after mutation\n${buildResult.stderr ?? buildResult.stdout ?? ''}`,
        gapHint: mutation.gapHint,
      };
    }

    const testResult = runFixtureSuite();
    const killed = testResult.status !== 0;

    return {
      name: mutation.name,
      status: killed ? 'killed' : 'survivor',
      exitCode: testResult.status,
      gapHint: mutation.gapHint,
    };
  } finally {
    restoreFile(relativePath, originalContent);
  }
}

function main() {
  if (!fs.existsSync(distPath)) {
    console.error('dist/ not found. Run `npm run build` first.');
    process.exit(1);
  }

  console.log('Health analyzer mutation testing\n');

  const results = [];

  for (const mutation of mutations) {
    process.stdout.write(`Testing ${mutation.name} ... `);
    const result = runMutation(mutation);
    results.push(result);

    if (result.status === 'killed') {
      console.log(`KILLED: ${mutation.name}`);
    } else if (result.status === 'survivor') {
      console.log(`SURVIVOR: ${mutation.name}`);
    } else {
      console.log(`ERROR: ${mutation.name}`);
      console.log(`  ${result.reason}`);
    }
  }

  const killed = results.filter((result) => result.status === 'killed').length;
  const errors = results.filter((result) => result.status === 'error').length;
  const survivors = results.filter((result) => result.status === 'survivor');
  const total = mutations.length;
  const score = Math.round((killed / total) * 100);

  console.log(`\nMutation score: ${killed}/${total} (${score}%)`);

  if (errors > 0) {
    console.log(`Errors: ${errors} mutation(s) could not be applied or built.`);
  }

  if (score < 80) {
    console.log('\nScore below 80% — the fixture suite has gaps.');
  }

  if (survivors.length > 0) {
    console.log('\nSurvivors (tests still passed — gaps to fill):');
    for (const survivor of survivors) {
      console.log(`  - ${survivor.name}`);
      if (survivor.gapHint) {
        console.log(`    why: ${survivor.gapHint}`);
      }
    }
  }

  const errorResults = results.filter((result) => result.status === 'error');
  if (errorResults.length > 0) {
    console.log('\nErrors:');
    for (const error of errorResults) {
      console.log(`  - ${error.name}: ${error.reason}`);
    }
  }

  npmBuild();

  process.exit(score < 80 || errors > 0 ? 1 : 0);
}

main();
