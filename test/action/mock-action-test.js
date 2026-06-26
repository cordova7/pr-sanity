#!/usr/bin/env node
/**
 * Mock GitHub Action test when `act` is not available locally.
 *
 * Validates action.yml structure, on-disk references, workflow wiring,
 * and that health --comment produces the PR comment artifact.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load as loadYaml } from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const cliPath = path.join(repoRoot, 'bin', 'pr-sanity.js');
const actionPath = path.join(repoRoot, 'action.yml');
const workflowsDir = path.join(repoRoot, '.github', 'workflows');
const highTensionFixture = path.join(repoRoot, 'test', 'fixtures', 'high-tension');
const distPath = path.join(repoRoot, 'dist', 'index.js');

function fail(message) {
  console.error(`FAIL: ${message}`);
  return false;
}

function pass(message) {
  console.log(`PASS: ${message}`);
  return true;
}

function readYaml(filePath) {
  return loadYaml(fs.readFileSync(filePath, 'utf8'));
}

function collectInputReferences(action) {
  const yamlText = fs.readFileSync(actionPath, 'utf8');
  const referenced = new Set();

  for (const match of yamlText.matchAll(/\$\{\{\s*inputs\.([a-zA-Z0-9_-]+)/g)) {
    referenced.add(match[1]);
  }

  for (const match of yamlText.matchAll(/if:\s*inputs\.([a-zA-Z0-9_-]+)/g)) {
    referenced.add(match[1]);
  }

  return referenced;
}

function extractActionFileReferences(actionText) {
  const refs = [];
  const pattern = /\$\{\{\s*github\.action_path\s*\}\}([^"'`\s]+)/g;

  for (const match of actionText.matchAll(pattern)) {
    refs.push(match[1].replace(/^\//, ''));
  }

  return [...new Set(refs)];
}

function assertActionFilesExist(actionText) {
  let ok = true;
  const refs = extractActionFileReferences(actionText);

  for (const relativePath of refs) {
    const absolutePath = path.join(repoRoot, relativePath);

    if (!fs.existsSync(absolutePath)) {
      ok = fail(`action references missing file: ${relativePath}`);
    } else {
      pass(`action file exists: ${relativePath}`);
    }
  }

  for (const required of ['bin/pr-sanity.js', 'package.json', 'package-lock.json']) {
    if (!fs.existsSync(path.join(repoRoot, required))) {
      ok = fail(`required action dependency missing: ${required}`);
    }
  }

  return ok;
}

function assertInputsUsed(action) {
  const declared = new Set(Object.keys(action.inputs ?? {}));
  const referenced = collectInputReferences(action);
  let ok = true;

  for (const inputName of declared) {
    if (!referenced.has(inputName)) {
      ok = fail(`action input never referenced in steps: ${inputName}`);
    } else {
      pass(`action input referenced: ${inputName}`);
    }
  }

  return ok;
}

function assertOutputsWired(action) {
  const outputs = Object.keys(action.outputs ?? {});
  const setOutputsStep = (action.runs?.steps ?? []).find((step) => step.id === 'set-outputs');

  if (setOutputsStep === undefined) {
    return fail('action missing set-outputs step');
  }

  const runScript = setOutputsStep.run ?? '';
  let ok = true;

  for (const outputName of outputs) {
    if (!runScript.includes(`${outputName}=`) && !runScript.includes(`outputs.${outputName}`)) {
      ok = fail(`output not set in set-outputs step: ${outputName}`);
    } else {
      pass(`output wired in set-outputs: ${outputName}`);
    }
  }

  return ok;
}

function loadWorkflowFiles() {
  if (!fs.existsSync(workflowsDir)) {
    return [];
  }

  return fs
    .readdirSync(workflowsDir)
    .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
    .map((name) => ({
      name,
      doc: readYaml(path.join(workflowsDir, name)),
      text: fs.readFileSync(path.join(workflowsDir, name), 'utf8'),
    }));
}

function assertWorkflowUsesAction(action, workflows) {
  if (workflows.length === 0) {
    return fail('no workflow files found under .github/workflows');
  }

  const declaredInputs = new Set(Object.keys(action.inputs ?? {}));
  let ok = true;
  let foundActionUse = false;

  for (const workflow of workflows) {
    const jobs = workflow.doc?.jobs ?? {};

    for (const [jobName, job] of Object.entries(jobs)) {
      for (const step of job.steps ?? []) {
        const uses = step.uses ?? '';

        if (uses === './' || uses.endsWith('/pr-sanity') || uses.includes('pr-sanity')) {
          foundActionUse = true;

          for (const inputName of Object.keys(step.with ?? {})) {
            if (!declaredInputs.has(inputName)) {
              ok = fail(
                `${workflow.name} job ${jobName}: unknown action input ${JSON.stringify(inputName)}`,
              );
            } else {
              pass(`${workflow.name}: uses action input ${inputName}`);
            }
          }
        }
      }
    }
  }

  if (!foundActionUse) {
    ok = fail('no workflow step uses the pr-sanity action');
  }

  return ok;
}

function assertHealthCommentArtifact() {
  const baselineDir = path.join(highTensionFixture, '.pr-sanity');
  const commentPath = path.join(baselineDir, 'health-comment.md');

  try {
    if (fs.existsSync(baselineDir)) {
      fs.rmSync(baselineDir, { recursive: true, force: true });
    }

    const result = spawnSync(
      process.execPath,
      [cliPath, 'health', '--path', highTensionFixture, '--comment'],
      {
        cwd: repoRoot,
        encoding: 'utf8',
      },
    );

    if (result.status !== 0) {
      return fail(`health --comment exited ${result.status}\n${result.stderr ?? ''}`);
    }

    if (!fs.existsSync(commentPath)) {
      return fail('health --comment did not create .pr-sanity/health-comment.md');
    }

    const contents = fs.readFileSync(commentPath, 'utf8');

    if (!contents.includes('Architecture Health')) {
      return fail('health-comment.md missing Architecture Health marker');
    }

    pass('health --comment creates .pr-sanity/health-comment.md');
    return true;
  } finally {
    if (fs.existsSync(baselineDir)) {
      fs.rmSync(baselineDir, { recursive: true, force: true });
    }
  }
}

function assertCiHealthSummary() {
  const result = spawnSync(
    process.execPath,
    [cliPath, 'health', '--path', highTensionFixture, '--ci'],
    {
      cwd: repoRoot,
      encoding: 'utf8',
    },
  );

  const summary = JSON.parse(result.stdout?.trim() ?? '{}');

  if (typeof summary.score !== 'number') {
    return fail('health --ci did not emit JSON with score (needed for health-score output)');
  }

  pass(`health --ci emits score for health-score output (${summary.score})`);
  return true;
}

function main() {
  console.log('pr-sanity GitHub Action mock test (act not used)\n');

  if (!fs.existsSync(distPath)) {
    console.error('dist/ not found. Run `npm run build` first.');
    process.exit(1);
  }

  const action = readYaml(actionPath);
  const actionText = fs.readFileSync(actionPath, 'utf8');
  const workflows = loadWorkflowFiles();

  let allPassed = true;

  if (!assertActionFilesExist(actionText)) allPassed = false;
  if (!assertInputsUsed(action)) allPassed = false;
  if (!assertOutputsWired(action)) allPassed = false;
  if (!assertWorkflowUsesAction(action, workflows)) allPassed = false;
  if (!assertCiHealthSummary()) allPassed = false;
  if (!assertHealthCommentArtifact()) allPassed = false;

  console.log('');

  if (allPassed) {
    console.log('Mock action test PASSED');
    process.exit(0);
  }

  console.error('Mock action test FAILED');
  process.exit(1);
}

main();
