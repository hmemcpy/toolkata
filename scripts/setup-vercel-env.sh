#!/bin/bash
# Setup Vercel environment variables interactively

set -e

add_env() {
  local name=$1
  local value=$2
  for env in production preview development; do
    # Remove existing, ignore errors if doesn't exist
    vercel env rm "$name" "$env" --yes 2>/dev/null || true
    echo -n "$value" | vercel env add "$name" "$env"
  done
}

echo "=== Vercel Environment Setup ==="
echo "(Existing values will be overwritten)"
echo ""

# GITHUB_TOKEN
echo "1. GITHUB_TOKEN (your GitHub PAT for content repo)"
echo "   This is used for fetching content and CMS operations."
read -p "   Enter value: " GITHUB_TOKEN
if [ -n "$GITHUB_TOKEN" ]; then
  add_env "GITHUB_TOKEN" "$GITHUB_TOKEN"
  echo "   ✓ Added GITHUB_TOKEN"
fi
echo ""

# GOOGLE_CLIENT_ID
echo "2. GOOGLE_CLIENT_ID (Google OAuth Client ID)"
echo "   Get from: https://console.cloud.google.com/apis/credentials"
read -p "   Enter value: " GOOGLE_CLIENT_ID
if [ -n "$GOOGLE_CLIENT_ID" ]; then
  add_env "GOOGLE_CLIENT_ID" "$GOOGLE_CLIENT_ID"
  echo "   ✓ Added GOOGLE_CLIENT_ID"
fi
echo ""

# GOOGLE_CLIENT_SECRET
echo "3. GOOGLE_CLIENT_SECRET (Google OAuth Client Secret)"
read -p "   Enter value: " GOOGLE_CLIENT_SECRET
if [ -n "$GOOGLE_CLIENT_SECRET" ]; then
  add_env "GOOGLE_CLIENT_SECRET" "$GOOGLE_CLIENT_SECRET"
  echo "   ✓ Added GOOGLE_CLIENT_SECRET"
fi
echo ""

# ADMIN_EMAILS
echo "4. ADMIN_EMAILS (comma-separated list of allowed admin emails)"
echo "   Example: admin@example.com,user@example.com"
read -p "   Enter value: " ADMIN_EMAILS
if [ -n "$ADMIN_EMAILS" ]; then
  add_env "ADMIN_EMAILS" "$ADMIN_EMAILS"
  echo "   ✓ Added ADMIN_EMAILS"
fi
echo ""

# NEXT_PUBLIC_SANDBOX_API_URL
echo "5. NEXT_PUBLIC_SANDBOX_API_URL (Sandbox API WebSocket URL)"
echo "   Example: wss://sandbox.toolkata.com"
read -p "   Enter value: " SANDBOX_URL
if [ -n "$SANDBOX_URL" ]; then
  add_env "NEXT_PUBLIC_SANDBOX_API_URL" "$SANDBOX_URL"
  echo "   ✓ Added NEXT_PUBLIC_SANDBOX_API_URL"
fi
echo ""

echo "=== Done ==="
echo ""
echo "Verify with: vercel env ls"
