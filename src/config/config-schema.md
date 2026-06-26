# `.pr-sanity.yml` configuration schema

Place a `.pr-sanity.yml` file in your repository root to tune `pr-sanity health` behavior.

## Top-level structure

```yaml
health:
  ignore: ...
  thresholds: ...
  blessed: ...
```

Only the `health` section is supported today.

## `health.moduleDepth`

- **Type:** `1 | 2 | 'auto'`
- **Default:** `'auto'`
- **Description:** Controls how `RepoFile.module` is inferred from file paths. Affects tension clustering and `health.ignore.modules` matching.

| Value | Behavior |
|-------|----------|
| `'auto'` | Use the first folder under `src/` (or repo root). If **all** top-level folders are generic (`Web`, `Infrastructure`, `ApplicationCore`, etc.), use the next level instead — unless that yields more than 20 distinct names (flat-structure guard). |
| `1` | Always use depth 1 (first folder under `src/`, or first path segment). |
| `2` | Always use depth 2 (second folder under `src/`, or second path segment). |

```yaml
health:
  moduleDepth: 2   # force feature-level grouping on layered repos
```

## `health.ignore`

Skip modules or disable specific detectors.

### `health.ignore.modules`

- **Type:** `string[]`
- **Default:** none
- **Description:** Module names to exclude from all health analyzers. Matches `RepoFile.module` (inferred per `health.moduleDepth`; by default the first folder under `src/`, or the first path segment).

```yaml
health:
  ignore:
    modules:
      - Legacy
      - Migrations
```

### `health.ignore.tensionTypes`

- **Type:** `string[]`
- **Default:** none
- **Description:** Disable specific health analyzers. Accepts analyzer names or finding tension type slugs.

| Analyzer name | Tension type slug |
|---------------|-------------------|
| `result-pattern` | `result-pattern-inconsistency` |
| `validation-strategy` | `validation-strategy-inconsistency` |
| `persistence-bypass` | `persistence-bypass` |
| `cqrs-bypass` | `cqrs-bypass` |

```yaml
health:
  ignore:
    tensionTypes:
      - cqrs-bypass
```

## `health.thresholds`

Override default bypass-rate gates. Findings emit when the rate is **strictly greater** than the threshold. Critical severity thresholds are unchanged.

### `health.thresholds.persistenceBypassRate`

- **Type:** `number` (0–1)
- **Default:** `0.10`
- **Analyzer:** `persistence-bypass`
- **Critical when:** bypass rate > 30%

### `health.thresholds.cqrsBypassRate`

- **Type:** `number` (0–1)
- **Default:** `0.15`
- **Analyzer:** `cqrs-bypass`
- **Critical when:** bypass rate > 35%

```yaml
health:
  thresholds:
    persistenceBypassRate: 0.20
    cqrsBypassRate: 0.18
```

## `health.blessed`

Declare the team's standard pattern so other approaches are flagged as non-dominant, regardless of file count.

### `health.blessed.resultPattern`

- **Type:** `string`
- **Default:** none (dominant pattern chosen by prevalence)
- **Valid labels:** `Ardalis.Result`, `ErrorOr`, `OneOf`, `raw bool`

### `health.blessed.validationStrategy`

- **Type:** `string`
- **Default:** none
- **Valid labels:** `FluentValidation`, `DataAnnotations`, `manual`

```yaml
health:
  blessed:
    resultPattern: Ardalis.Result
    validationStrategy: FluentValidation
```

## Full example

See [`.pr-sanity.example.yml`](../../.pr-sanity.example.yml) at the project root:

```yaml
health:
  ignore:
    modules:
      - Legacy
      - Migrations
  thresholds:
    persistenceBypassRate: 0.20
  blessed:
    resultPattern: Ardalis.Result
```

## Loading behavior

- Config path: `<repo-root>/.pr-sanity.yml`
- Missing file: treated as `{}` (all defaults)
- Parse errors: treated as `{}` (silent fallback)
