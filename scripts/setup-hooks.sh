#!/bin/bash
set -e

echo "Setting up git hooks..."

# Copy pre-push hook
cp scripts/pre-push.sh .git/hooks/pre-push
chmod +x .git/hooks/pre-push

echo "✅ Git hooks installed!"
