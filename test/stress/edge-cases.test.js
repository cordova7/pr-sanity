#!/usr/bin/env node
/**
 * Stress tests for health analyzer edge cases in real .NET codebases.
 *
 * Run: node test/stress/edge-cases.test.js
 * Requires: npm run build (dist/ must exist)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  detectPersistenceBypass,
  detectResultPattern,
  inferLayer,
  inferModule,
  persistenceBypassAnalyzer,
  resultPatternAnalyzer,
} from '../../dist/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const fixturesRoot = path.join(__dirname, 'fixtures');
const distPath = path.join(repoRoot, 'dist', 'index.js');

const RESULT_PATTERN = 'result-pattern';
const PERSISTENCE_BYPASS = 'persistence-bypass';

function readFixture(relativePath) {
  return fs.readFileSync(path.join(fixturesRoot, relativePath), 'utf8');
}

function repoFile(relativePath) {
  return {
    path: relativePath.replace(/\\/g, '/'),
    module: inferModule(relativePath),
    layer: inferLayer(relativePath),
  };
}

async function runAnalyzer(analyzer, relativePaths) {
  const context = {
    rootPath: fixturesRoot,
    files: relativePaths.map(repoFile),
  };

  return analyzer.run(context, {});
}

function assertDetect(caseDef, actual) {
  const { expectDetect, expectPattern, documentedBehavior } = caseDef;

  if (expectDetect === false) {
    const expected =
      caseDef.analyzer === PERSISTENCE_BYPASS ? false : null;

    if (actual !== expected) {
      return {
        ok: false,
        reason: caseDef.failureExplain?.(actual) ?? `expected ${String(expected)}, got ${JSON.stringify(actual)}`,
      };
    }

    return { ok: true };
  }

  if (expectDetect === true && expectPattern !== undefined) {
    if (actual !== expectPattern) {
      return {
        ok: false,
        reason: `expected pattern ${JSON.stringify(expectPattern)}, got ${JSON.stringify(actual)}`,
      };
    }

    if (documentedBehavior) {
      return { ok: true, note: documentedBehavior };
    }

    return { ok: true };
  }

  return { ok: true };
}

const edgeCases = [
  {
    id: 1,
    name: 'Ardalis.Result in comment only',
    analyzer: RESULT_PATTERN,
    fixture: 'src/Orders/Application/Services/OrderServiceArdalisComment.cs',
    rule: 'Ardalis.Result in a comment must not count as usage.',
    expectDetect: false,
    failureExplain: (actual) =>
      `content.includes('Ardalis.Result') matches the comment text "${actual}" — substring search does not ignore // comments.`,
  },
  {
    id: 2,
    name: 'Result<T> in string literal',
    analyzer: RESULT_PATTERN,
    fixture: 'src/Orders/Application/Services/OrderServiceResultString.cs',
    rule: 'Result<T> inside a string literal must not count as a result pattern.',
    expectDetect: false,
    failureExplain: (actual) =>
      `detectResultPattern returned ${JSON.stringify(actual)} — Result< in a string should not match unless paired with using Ardalis.`,
  },
  {
    id: 3,
    name: 'Test class in Tests layer',
    analyzer: RESULT_PATTERN,
    fixture: 'src/Orders/Tests/ResultPatternTests.cs',
    rule: 'Files in the Tests layer must be skipped entirely by the result-pattern analyzer.',
    integration: true,
    expectLayer: 'Tests',
    skipDetectAssertion: true,
    documentedBehavior:
      'detectResultPattern would match Ardalis.Result in the comment, but the analyzer never calls it for Tests layer.',
    failureExplain: () =>
      'Tests-layer file was scanned — isResultPatternLayer only allows Application/API.',
  },
  {
    id: 4,
    name: 'ErrorOr in using namespace only',
    analyzer: RESULT_PATTERN,
    fixture: 'src/Orders/Application/Helpers/ErrorOrUtilityHelper.cs',
    rule: 'ErrorOr in a using directive without ErrorOr<T> return type — document current detector behavior.',
    expectDetect: true,
    expectPattern: 'ErrorOr',
    documentedBehavior:
      'Detector treats any "using ErrorOr" substring as ErrorOr usage (matches "using ErrorOr.Utilities").',
    failureExplain: (actual) =>
      `expected documented ErrorOr detection, got ${JSON.stringify(actual)}.`,
  },
  {
    id: 5,
    name: 'DbContext in comment only',
    analyzer: PERSISTENCE_BYPASS,
    fixture: 'src/Orders/Application/Services/OrderServiceDbContextComment.cs',
    rule: 'DbContext mentioned only in a comment must not trigger persistence bypass.',
    expectDetect: false,
    failureExplain: () =>
      'A DbContext regex matched comment text — patterns should ignore // comments.',
  },
  {
    id: 6,
    name: 'DbContext in string literal',
    analyzer: PERSISTENCE_BYPASS,
    fixture: 'src/Orders/Application/Services/OrderServiceDbContextString.cs',
    rule: 'DbContext inside a log message string must not trigger persistence bypass.',
    expectDetect: false,
    failureExplain: () =>
      'DB_CONTEXT_CTOR /\\([^)]*\\bDbContext\\b[^)]*\\)/ matches LogError("DbContext timeout...") — ' +
      'parentheses in method calls are treated as constructor injection.',
  },
  {
    id: 7,
    name: 'Repository interface in Application layer',
    analyzer: PERSISTENCE_BYPASS,
    fixture: 'src/Orders/Application/Repositories/IOrderRepositoryEdge.cs',
    rule: 'Repository interfaces must not trigger persistence bypass.',
    expectDetect: false,
    failureExplain: () =>
      'Interface file matched a DbContext/_context/.Set</DbSet< heuristic incorrectly.',
  },
  {
    id: 8,
    name: 'IOrderRepository injection (correct pattern)',
    analyzer: PERSISTENCE_BYPASS,
    fixture: 'src/Orders/Application/Services/OrderServiceWithRepository.cs',
    rule: 'Injecting IOrderRepository must not trigger persistence bypass.',
    expectDetect: false,
    failureExplain: () =>
      'Correct repository injection matched a DbContext/_context/.Set</DbSet< heuristic incorrectly.',
  },
];

async function runEdgeCase(caseDef) {
  const content = readFixture(caseDef.fixture);
  let pendingNote = caseDef.skipDetectAssertion ? caseDef.documentedBehavior : undefined;

  if (caseDef.expectLayer !== undefined) {
    const layer = inferLayer(caseDef.fixture);

    if (layer !== caseDef.expectLayer) {
      return {
        ok: false,
        reason: `expected layer ${caseDef.expectLayer}, inferLayer returned ${layer}`,
      };
    }
  }

  if (!caseDef.skipDetectAssertion) {
    const detect =
      caseDef.analyzer === RESULT_PATTERN ? detectResultPattern : detectPersistenceBypass;
    const actual = detect(content);
    const detectResult = assertDetect(caseDef, actual);

    if (!detectResult.ok) {
      return detectResult;
    }

    if (detectResult.note) {
      pendingNote = detectResult.note;
    }
  }

  if (caseDef.integration && caseDef.id === 3) {
    const companion = 'src/Orders/Application/Handlers/SingleErrorOrHandler.cs';
    const findings = await runAnalyzer(resultPatternAnalyzer, [caseDef.fixture, companion]);

    if (findings.length > 0) {
      return {
        ok: false,
        reason:
          'Tests-layer file was classified alongside Application ErrorOr handler — ' +
          `finding: ${findings[0].detail}. ` +
          'Comment "Ardalis.Result" in the test file would be counted if the layer gate failed.',
      };
    }
  }

  if (caseDef.analyzer === PERSISTENCE_BYPASS && caseDef.expectDetect === false) {
    const findings = await runAnalyzer(persistenceBypassAnalyzer, [caseDef.fixture]);

    if (findings.length > 0 && findings[0].affectedFiles?.includes(caseDef.fixture.replace(/\\/g, '/'))) {
      return {
        ok: false,
        reason: `persistence-bypass analyzer flagged this file at module rate: ${findings[0].detail}`,
      };
    }
  }

  return pendingNote ? { ok: true, note: pendingNote } : { ok: true };
}

async function main() {
  if (!fs.existsSync(distPath)) {
    console.error('dist/ not found. Run `npm run build` first.');
    process.exit(1);
  }

  console.log('Health analyzer edge-case stress tests\n');

  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const caseDef of edgeCases) {
    const label = `[${caseDef.id}] ${caseDef.name}`;
    process.stdout.write(`${label} ... `);

    try {
      const result = await runEdgeCase(caseDef);

      if (result.ok) {
        console.log('PASS');
        console.log(`    rule: ${caseDef.rule}`);
        if (result.note) {
          console.log(`    note: ${result.note}`);
        }
        passed += 1;
      } else {
        console.log('FAIL');
        console.log(`    rule: ${caseDef.rule}`);
        console.log(`    why: ${result.reason}`);
        failed += 1;
        failures.push({ ...caseDef, reason: result.reason });
      }
    } catch (error) {
      console.log('FAIL');
      console.log(`    rule: ${caseDef.rule}`);
      console.log(`    why: ${error instanceof Error ? error.message : String(error)}`);
      failed += 1;
      failures.push({
        ...caseDef,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log(`\n${passed} PASS, ${failed} FAIL (${edgeCases.length} edge cases)`);

  if (failures.length > 0) {
    console.log('\nFailure summary:');
    for (const failure of failures) {
      console.log(`  ${failure.id}. ${failure.name}: ${failure.reason}`);
    }
    process.exit(1);
  }

  process.exit(0);
}

main();
