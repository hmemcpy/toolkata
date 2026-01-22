#!/bin/bash
# Validate MDX content for unexpected Unicode characters
#
# This script WARNS about non-ASCII characters that might indicate LLM output errors.
# Some non-ASCII is legitimate (loan words, diacritics, original terms).
#
# Allowed by default:
#   - ASCII printable characters
#   - Common punctuation: em-dash (—), arrows (→←), bullets (•◉○)
#   - Diacritics in Latin script (café, naïve, résumé)
#
# Flagged for REVIEW (not necessarily errors):
#   - Chinese (CJK) - often indicates LLM mixing languages
#   - Cyrillic - could be legitimate names
#   - Greek - often math symbols, but could be LLM errors
#   - Arabic, Korean, Japanese - review for context
#
# Usage: ./scripts/validate-content.sh [--strict]
#   --strict: Exit with error code if any flagged characters found
#
# To allowlist specific text, add to .content-allowlist (one pattern per line)

set -e

CONTENT_DIR="packages/web/content"
STRICT_MODE=false
FOUND_ISSUES=0
ALLOWLIST_FILE=".content-allowlist"

if [[ "$1" == "--strict" ]]; then
  STRICT_MODE=true
fi

echo "Validating content for unexpected Unicode characters..."
echo "(Use --strict to fail on any findings)"
echo

# Function to check for a character range
check_range() {
  local name="$1"
  local range="$2"
  local description="$3"

  echo "Checking for $name..."
  local matches
  matches=$(perl -CSD -ne "print \"\$ARGV:\$.: \$_\" if /$range/" "$CONTENT_DIR"/**/*.mdx 2>/dev/null || true)

  if [[ -n "$matches" ]]; then
    echo "  REVIEW: Found $name - $description"
    echo "$matches" | head -5
    if [[ $(echo "$matches" | wc -l) -gt 5 ]]; then
      echo "  ... and more"
    fi
    echo
    FOUND_ISSUES=$((FOUND_ISSUES + 1))
  else
    echo "  OK"
  fi
}

# High suspicion (likely LLM errors)
check_range "Chinese characters" '[\x{4e00}-\x{9fff}]' "Often indicates LLM mixing languages"

# Medium suspicion (review needed)
check_range "Cyrillic characters" '[\x{0400}-\x{04FF}]' "Could be names or LLM errors"
check_range "Arabic characters" '[\x{0600}-\x{06FF}]' "Review for context"
check_range "Korean characters" '[\x{AC00}-\x{D7AF}]' "Review for context"
check_range "Japanese Hiragana/Katakana" '[\x{3040}-\x{30FF}]' "Could be loan words or errors"

# Low suspicion (often legitimate)
echo "Checking for Greek characters (outside math contexts)..."
greek_matches=$(perl -CSD -ne 'print "$ARGV:$.: $_" if /[\x{0370}-\x{03FF}]/ && !/α|β|γ|δ|π|Σ|Δ|λ/' "$CONTENT_DIR"/**/*.mdx 2>/dev/null || true)
if [[ -n "$greek_matches" ]]; then
  echo "  REVIEW: Found Greek characters (excluding common math symbols)"
  echo "$greek_matches" | head -5
  echo
  FOUND_ISSUES=$((FOUND_ISSUES + 1))
else
  echo "  OK"
fi

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ $FOUND_ISSUES -eq 0 ]]; then
  echo "✓ No unexpected Unicode found"
  exit 0
else
  echo "⚠ Found $FOUND_ISSUES category/categories with non-ASCII characters"
  echo
  echo "These may be:"
  echo "  - LLM output errors (likely if Chinese mixed with English)"
  echo "  - Legitimate loan words or names (kaizen, café, names)"
  echo "  - Technical terms from other languages"
  echo
  echo "Please review the findings above."

  if $STRICT_MODE; then
    echo
    echo "Strict mode: Exiting with error"
    exit 1
  else
    exit 0
  fi
fi
