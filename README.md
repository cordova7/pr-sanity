# pr-sanity

Sanity checks for pull requests. A TypeScript CLI that runs pluggable analyzers against a git diff.

## Requirements

- Node.js >= 20
- Git available on `PATH`

## Install

```bash
npm install
npm run build
```

Link locally for global use:

```bash
npm link
pr-sanity --help
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev -- <args>` | Run the CLI from TypeScript via tsx |
| `npm run build` | Bundle to `dist/` with tsup |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |
| `npm run typecheck` | Type-check without emitting |

## Usage

```bash
# Run all registered analyzers
npm run dev -- check

# Compare against a specific base branch
npm run dev -- check --base origin/main --head HEAD

# Run a single analyzer
npm run dev -- check --analyzer noop

# JSON output for CI
npm run dev -- check --format json

# List available analyzers
npm run dev -- list
```

After building:

```bash
npx pr-sanity check
```

## Architecture

```
src/
  cli.ts          Commander entry point and command wiring
  index.ts        Library re-exports for programmatic use
  git/            Git subprocess wrapper; builds GitContext
  analyzers/      Pluggable check implementations + registry
  reporters/      Output formatters (console, json)
  models/         Shared domain types (no I/O)
```

### Data flow

1. **CLI** (`cli.ts`) parses arguments and invokes the pipeline.
2. **Git** (`git/`) resolves the merge base and collects changed files + diff into a `GitContext`.
3. **Analyzers** (`analyzers/`) each receive the context and return an `AnalysisResult` with `Finding`s.
4. **Reporters** (`reporters/`) format aggregated results for humans or machines.
5. **CLI** exits with code `1` if any finding has `severity: 'error'`.

### Core types

```typescript
interface Finding {
  id: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  file?: string;
  line?: number;
}

interface AnalysisResult {
  analyzerId: string;
  findings: Finding[];
}

interface GitContext {
  baseRef: string;
  headRef: string;
  changedFiles: string[];
  diff?: string;
}
```

### Adding an analyzer

1. Create `src/analyzers/my-check.analyzer.ts`:

```typescript
import type { Analyzer } from './types.js';
import type { GitContext } from '../models/git-context.js';
import type { AnalysisResult } from '../models/analysis-result.js';

export const myCheckAnalyzer: Analyzer = {
  id: 'my-check',
  description: 'Describe what this check does',

  async run(context: GitContext): Promise<AnalysisResult> {
    const findings = context.changedFiles
      .filter((file) => file.endsWith('.log'))
      .map((file) => ({
        id: 'no-log-files',
        severity: 'error' as const,
        message: `Log file should not be committed: ${file}`,
        file,
      }));

    return { analyzerId: 'my-check', findings };
  },
};
```

2. Register it in `src/analyzers/index.ts`:

```typescript
import { myCheckAnalyzer } from './my-check.analyzer.js';

register(myCheckAnalyzer);
```

3. Run it:

```bash
npm run dev -- check --analyzer my-check
```

No changes to `cli.ts` are required — the registry handles discovery and selection.

## License

MIT
