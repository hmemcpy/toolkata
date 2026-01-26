#!/bin/bash
set -e

echo "🔍 Running pre-push checks..."

# Run lint
echo "  • lint..."
bun run lint --quiet

# Run typecheck
echo "  • typecheck..."
bun run typecheck

# Run build
echo "  • build..."
bun run --cwd packages/web build > /dev/null 2>&1

echo "✅ Pre-push checks passed!"
