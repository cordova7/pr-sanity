# GitHub Action

This repo includes a composite action ([`action.yml`](../action.yml)) and a PR workflow ([`.github/workflows/pr-sanity.yml`](../.github/workflows/pr-sanity.yml)).

## Included workflow

The workflow runs on every pull request. It:

1. Checks out the PR with full git history (`fetch-depth: 0`)
2. Fetches the PR base branch
3. Runs `pr-sanity check` with `--max-risk 66` (fails at High, score 67+)
4. Uploads `pr-sanity-report.json` as an artifact

## Reuse in another repository

```yaml
name: PR Sanity

on:
  pull_request:

jobs:
  pr-sanity:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write   # required when run-health is enabled
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Fetch base branch
        run: git fetch origin ${{ github.base_ref }}

      - name: Run pr-sanity
        uses: cordova7/pr-sanity@v0.1.0
        id: pr-sanity
        with:
          base: origin/${{ github.base_ref }}
          max-risk: '66'
          run-health: 'true'

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: pr-sanity-report
          path: pr-sanity-report.json
          if-no-files-found: warn
```

When `run-health: 'true'`, the action also:

- Runs `pr-sanity health --ci --comment --save-baseline --format html`
- Uploads `.pr-sanity/health-report.html` as a `pr-sanity-health-report` artifact
- Posts or updates a PR comment from `.pr-sanity/health-comment.md` (upserted per PR, no spam on push)
- Exposes the health score via the `health-score` output

```yaml
      - name: Use health score
        if: steps.pr-sanity.outputs.health-score != ''
        run: echo "Health score is ${{ steps.pr-sanity.outputs.health-score }}"
```

## Requirements for callers

- `permissions: contents: read` (and `pull-requests: write` when `run-health: 'true'`)
- `actions/checkout` with `fetch-depth: 0`
- Fetch the base branch before running the action

## Action inputs

| Input | Default | Description |
| ----- | ------- | ----------- |
| `base` | *(empty)* | Base git ref (workflow should pass `origin/${{ github.base_ref }}`) |
| `head` | `HEAD` | Head ref to analyze |
| `max-risk` | `66` | Fail when risk score **exceeds** this value |
| `report-path` | `pr-sanity-report.json` | Path for the JSON report file |
| `format` | `console` | Stdout format (`console` or `json`) |
| `node-version` | `20` | Node.js version for `setup-node` |
| `run-health` | `false` | Run architecture health scan after PR check |

## Action outputs

| Output | Description |
| ------ | ----------- |
| `report-path` | Path to the JSON report file |
| `risk-score` | Numeric risk score from the report |
| `risk-level` | Risk level (`Low`, `Medium`, or `High`) |
| `health-score` | Health score (0–100) when `run-health` is enabled |

## Report artifact schema

```json
{
  "findings": [
    {
      "severity": "warning",
      "title": "New endpoint missing [Authorize]",
      "explanation": "...",
      "file": "UserController.cs"
    }
  ],
  "risk": {
    "score": 25,
    "level": "Low",
    "breakdown": [
      {
        "ruleId": "missing-authorize",
        "label": "Missing Authorize",
        "points": 25,
        "count": 1
      }
    ]
  }
}
```
