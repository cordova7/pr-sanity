#!/bin/bash
# Tests the GitHub Action locally using act.
# Requires: act (https://github.com/nektos/act), Docker

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PR_SANITY_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEST_REPO="/tmp/action-test-repo"
ACT_OUTPUT="/tmp/act-output.txt"

echo "pr-sanity GitHub Action test (act)"

if ! command -v act >/dev/null 2>&1; then
  echo "act is not installed."
  echo "Install: brew install act (mac) or see https://github.com/nektos/act"
  exit 1
fi

rm -rf "$TEST_REPO"
mkdir -p "$TEST_REPO"
cd "$TEST_REPO"
git init -b main

cp -r "$PR_SANITY_ROOT/test/fixtures/high-tension/src" ./src
mkdir -p .github/actions/pr-sanity
# act needs the full action package (npm ci + build), not just action.yml
tar -C "$PR_SANITY_ROOT" \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=/tmp \
  -cf - . | tar -C .github/actions/pr-sanity -xf -

mkdir -p .github/workflows
cat > .github/workflows/test.yml << 'EOF'
name: Test
on: [push, pull_request]
jobs:
  sanity:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/pr-sanity
        with:
          run-health: 'true'
EOF

git add .
git config user.email "test@example.com"
git config user.name "Action Test"
git commit -m "test commit"

act push \
  --platform ubuntu-latest=ghcr.io/catthehacker/ubuntu:act-latest \
  --secret GITHUB_TOKEN=fake-token-for-local \
  2>&1 | tee "$ACT_OUTPUT"

if grep -q "Architecture Drift Report" "$ACT_OUTPUT"; then
  echo "✓ Health report appeared in action output"
else
  echo "✗ Health report NOT found in action output"
  cat "$ACT_OUTPUT"
  exit 1
fi

if grep -q "health-score" "$ACT_OUTPUT"; then
  echo "✓ health-score output was set"
else
  echo "✗ health-score output NOT found"
  exit 1
fi

echo "Action test PASSED"
