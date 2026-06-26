#!/bin/bash
# Demonstrates drift detection on a real repo
# Usage: bash test/demo-drift.sh /path/to/dotnet/repo

REPO=$1
if [ -z "$REPO" ]; then
  echo "Usage: bash test/demo-drift.sh /path/to/dotnet/repo"
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CLI="$REPO_ROOT/bin/pr-sanity.js"

echo "=== Step 1: Seed baseline ==="
node "$CLI" health --path "$REPO" --seed-baseline

echo ""
echo "=== Step 2: Introducing drift ==="
DRIFT_FILE="$REPO/src/DriftExample.cs"
cat > "$DRIFT_FILE" << 'EOF'
using ErrorOr;
// Intentional drift: introduces ErrorOr into an Ardalis.Result codebase
public class DriftExampleService {
    private readonly AppDbContext _context;
    public DriftExampleService(AppDbContext context) { _context = context; }
    public ErrorOr<bool> Handle() => true;
}
EOF

echo ""
echo "=== Step 3: Detect drift ==="
node "$CLI" health --path "$REPO"

echo ""
echo "=== Cleanup ==="
rm "$DRIFT_FILE"
echo "Drift file removed. Baseline preserved at $REPO/.pr-sanity/"
