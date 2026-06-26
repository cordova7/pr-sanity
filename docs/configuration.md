# Configuration

Create `.pr-sanity.yml` in your repo root:

```yaml
health:
  ignore:
    modules:
      - Legacy
      - Migrations
  thresholds:
    persistenceBypassRate: 0.20   # we know Billing is bad, allow 20%
  blessed:
    resultPattern: Ardalis.Result  # this is our standard
```

See [config schema](../src/config/config-schema.md) for full options (`ignore.tensionTypes`, `blessed.validationStrategy`, `moduleDepth`, etc.).

## Health analyzers

| Analyzer | Detects | Config key |
|----------|---------|------------|
| Result pattern | Multiple Result/error types in use | `blessed.resultPattern` |
| Validation strategy | Mixed FluentValidation / DataAnnotations / manual | `blessed.validationStrategy` |
| Persistence bypass | Application layer accessing DbContext directly | `thresholds.persistenceBypassRate` |
| CQRS bypass | Services dispatching without MediatR | `thresholds.cqrsBypassRate` |

## PR check risk scoring

| Rule              | Points |
| ----------------- | ------ |
| Missing Authorize | +25    |
| Missing Migration | +20    |
| No Tests          | +15    |
| Public API Change | +10    |

Points stack per matching finding and cap at **100**. Risk levels:

- **Low** — 0–33
- **Medium** — 34–66
- **High** — 67–100

## Built-in PR analyzers

| Analyzer | Severity | Trigger |
| -------- | -------- | ------- |
| Missing tests | warning | Business logic changed without test project changes |
| Missing migration | warning | Entity files changed without EF migration changes |
| Missing authorize | warning | New controller action without `[Authorize]` |
| Public API change | info | Added or modified public types/methods |
