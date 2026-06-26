import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts', 'src/index.ts'],
  format: ['esm'],
  target: 'node20',
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  loader: {
    '.json': 'json',
  },
  banner: {
    js: '#!/usr/bin/env node',
  },
});
