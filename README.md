# pr-sanity

[![npm version](https://img.shields.io/npm/v/pr-sanity.svg)](https://www.npmjs.com/package/pr-sanity)
[![license](https://img.shields.io/npm/l/pr-sanity.svg)](https://github.com/cordova7/pr-sanity/blob/main/LICENSE)

Architecture drift detection for .NET. Finds where your codebase disagrees with itself.

| | |
| --- | --- |
| **Is** | Internal consistency, module-level drift, PR risk gates |
| **Isn't** | Style rules, code coverage, "you must use Clean Architecture" |

```bash
npx pr-sanity health --demo
npm install -g pr-sanity
pr-sanity health --path /path/to/your/dotnet/repo
```

Install from [npm](https://www.npmjs.com/package/pr-sanity).

<details>
<summary>Example output (eShopOnWeb demo)</summary>

```
Architecture Drift Report · eShopOnWeb

2025-03-12 09:41:18

4 tensions detected across 4 modules

Top Drift Sources

─────────────────

ApplicationCore● result pattern  ● persistence bypass    2 tensions
Web            ● result pattern  ● CQRS bypass    2 tensions
Controllers    ◐ validation    1 tension
Pages          ◐ validation    1 tension

─────────────────

Tensions Detail

─────────────────

● MediatR bypass in Application layer                                 [CRITICAL]

Application layer bypasses MediatR dispatch

4 bypass files vs 18 handlers (18% bypass rate)

Modules: Web
Affected files:
  src/Web/Services/BasketViewModelService.cs
  src/Web/Controllers/OrderController.cs

● Repository pattern bypass in Application layer                      [CRITICAL]

Application layer files access DbContext directly

9 of 24 Application-layer files (38%) access DbContext directly

Modules: ApplicationCore
Affected files:
  src/ApplicationCore/Services/BasketService.cs
  src/ApplicationCore/Services/OrderService.cs
  src/Infrastructure/Data/CatalogContext.cs

● Result pattern inconsistency                                        [CRITICAL]

3 competing approaches detected

· Ardalis.Result   62%  (dominant)
· OneOf            24%  ← non-dominant
· raw bool         14%  ← non-dominant

Modules: ApplicationCore, Web
Affected files:
  src/ApplicationCore/Services/BasketService.cs
  src/Web/Controllers/OrderController.cs
  src/Web/Pages/Basket/Checkout.cshtml.cs

◐ Validation strategy inconsistency                                   [WARNING]

2 competing approaches detected

· DataAnnotations  88%  (dominant)
· manual           12%  ← non-dominant

Modules: Controllers, Pages
Affected files:
  src/Web/Controllers/ManageController.cs
  src/Web/Pages/Basket/Index.cshtml.cs

─────────────────

Passing

─────────────────

✓ Transaction boundary consistency
✓ Dependency inversion compliance
✓ Layer boundary enforcement

─────────────────

Health Score: 59/100

─────────────────
Run pr-sanity drift to see how long these tensions have been present.

This is a demo using eShopOnWeb snapshot data.
Run against your repo: pr-sanity health --path /path/to/your/repo
```

</details>

## Quick start

1. `npx pr-sanity health --demo` to see a sample report (no .NET repo needed)
2. `pr-sanity health --path .` to scan your repo
3. `pr-sanity health --save-baseline` then `pr-sanity drift` to track drift over time

## What it detects

pr-sanity scans your .NET codebase for architectural tensions: places where the codebase is inconsistent with itself. Not style violations. Not missing tests. It surfaces competing Result patterns, validation approaches that differ across modules, Application-layer services that bypass repositories, and CQRS adoption gaps. Findings are clustered by module so you know where to focus.

## Tested on

- [eShopOnWeb](https://github.com/dotnet-architecture/eShopOnWeb) (Microsoft), score 95, 1 tension
- [CleanArchitecture](https://github.com/jasontaylordev/CleanArchitecture) (jasontaylordev), score 90, 2 tensions
- [NorthwindTraders](https://github.com/jasontaylordev/NorthwindTraders) (jasontaylordev), score 95, 1 tension

These are real runs, not synthetic fixtures. The scores are locked in our regression suite.

## Commands

`health` produces a module-clustered tension report and score. Use `--save-baseline` then `drift` to track what's new or getting worse. `check` gates PRs on diff-level risks (missing tests, migrations, authorize, public API changes).

Requires Node.js 18+ and Git on PATH.

### check

```bash
pr-sanity check --base origin/main -H HEAD
pr-sanity check --base origin/main -H HEAD --format json --max-risk 66
```

On Windows, npm reserves `--head`; use `-H` instead.

### health

```bash
pr-sanity health --demo
pr-sanity health --path .
pr-sanity health --save-baseline   # persist scan for drift tracking
pr-sanity health --ci --comment    # CI JSON + GitHub PR comment
```

### drift

```bash
pr-sanity drift --last 8
```

See [configuration](docs/configuration.md) for `.pr-sanity.yml` options.

## GitHub Action

```yaml
- uses: actions/checkout@v4
  with: { fetch-depth: 0 }
- run: git fetch origin ${{ github.base_ref }}
- uses: cordova7/pr-sanity@v0.1.0
  with:
    base: origin/${{ github.base_ref }}
    max-risk: '66'
    run-health: 'true'
```

Posts a PR comment, uploads a health HTML report, and fails on high risk or critical tensions.

[Full GitHub Action docs](docs/github-action.md)

## FAQ

**Q: Does it work on non-Clean-Architecture repos?**

A: Yes. The detectors look for internal consistency, not adherence to any specific pattern.

**Q: What if my team intentionally uses two Result patterns?**

A: Add a blessed pattern in `.pr-sanity.yml` and the detector will treat it as the standard. See [configuration](docs/configuration.md).

**Q: Will it slow down my CI?**

A: The health command runs in under 10 seconds on repos up to 5,000 files. The check command (diff-only) runs in under 2s.

## License

MIT. See [contributing](docs/contributing.md) for development setup.
