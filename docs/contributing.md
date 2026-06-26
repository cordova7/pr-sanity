# Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for adding analyzers, running fixtures, and the health analyzer development process.

## Development setup

```bash
npm install
npm run build
npm link
pr-sanity --help
```

## Development scripts

| Command | Description |
| ------- | ----------- |
| `npm test` | Build and run fixture harness (5 cases) |
| `npm run test:fixtures` | Same as `npm test` |
| `npm run test:verbose` | Fixture harness with finding details |
| `npm run demo` | Bundled eShopOnWeb health demo (`health --demo`) |
| `npm run demo:drift` | Drift demo script (`test/demo-drift.sh`) |
| `npm run test:regression` | Regression tests against real public .NET repos |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run dev -- <args>` | Run CLI from TypeScript via tsx |
