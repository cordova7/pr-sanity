#!/usr/bin/env node
/**
 * Generates a large synthetic .NET repo for performance adversarial testing.
 *
 * Usage: node test/adversarial/generate-large-repo.js [outputDir] [fileCount]
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot =
  process.platform === 'win32'
    ? path.join(os.tmpdir(), 'pr-sanity-large-repo')
    : '/tmp/pr-sanity-large-repo';

const outputRoot = path.resolve(process.argv[2] ?? defaultRoot);
const fileCount = Number.parseInt(process.argv[3] ?? '10000', 10);

if (!Number.isFinite(fileCount) || fileCount < 1) {
  console.error('fileCount must be a positive integer');
  process.exit(1);
}

fs.rmSync(outputRoot, { recursive: true, force: true });

const started = performance.now();

for (let index = 0; index < fileCount; index += 1) {
  const moduleName = `Module${index % 100}`;
  const dir = path.join(outputRoot, 'src', moduleName, 'Application', 'Services');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, `Service${index}.cs`),
    `namespace ${moduleName}.Application.Services;\n\npublic class Service${index} { public int Id => ${index}; }\n`,
    'utf8',
  );
}

const elapsedMs = Math.round(performance.now() - started);
console.log(`Generated ${fileCount} .cs files in ${elapsedMs}ms at ${outputRoot}`);
