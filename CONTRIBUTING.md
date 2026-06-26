# Contributing

## The fastest way to contribute: report a false positive

If pr-sanity flags something in your codebase that isn't actually a tension, open a false positive issue. These are the most valuable contributions — they make the detectors more precise for everyone.

## Adding a new detector

1. Create src/health/analyzers/your-detector.analyzer.ts
2. Implement the HealthAnalyzer interface
3. Add fixture files to test/fixtures/high-tension/ and test/fixtures/low-tension/ that prove it works
4. Register in src/health/index.ts
5. Add to the detector table in README.md

The bar for a new detector: it must fire on at least one real public GitHub repo. Synthetic-only detectors don't ship.

## What we don't want

- Detectors that fire on style preferences
- Detectors that require a specific architecture pattern
- Anything that requires Roslyn (yet — that's a future milestone)
