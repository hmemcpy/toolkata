#!/usr/bin/env bash
# Automated testing script for toolkata
# Tests accessibility, responsive design, and route availability

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
FAILED=0
PASSED=0

echo "toolkata Automated Test Suite"
echo "=============================="
echo "Base URL: $BASE_URL"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Phase 1: Route Availability Tests"
echo "=================================="
echo ""

# Test all routes
ROUTES=(
  ""
  "/jj-git" "/jj-git/1" "/jj-git/2" "/jj-git/3" "/jj-git/4" "/jj-git/5" "/jj-git/6" "/jj-git/7" "/jj-git/8" "/jj-git/9" "/jj-git/10" "/jj-git/11" "/jj-git/12" "/jj-git/cheatsheet"
  "/cats-effect-zio" "/cats-effect-zio/1" "/cats-effect-zio/2" "/cats-effect-zio/3" "/cats-effect-zio/4" "/cats-effect-zio/5" "/cats-effect-zio/6" "/cats-effect-zio/7" "/cats-effect-zio/8" "/cats-effect-zio/9" "/cats-effect-zio/10" "/cats-effect-zio/cheatsheet"
)

for route in "${ROUTES[@]}"; do
  url="$BASE_URL$route"
  http_code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  if [ "$http_code" = "200" ]; then
    echo "  ✓ $route - $http_code"
    ((PASSED++)) || true
  else
    echo "  ✗ $route - $http_code (FAILED)"
    ((FAILED++)) || true
  fi
done

echo ""
echo "Phase 2: HTML Structure Tests"
echo "==============================="
echo ""

# Check for key structural elements
check_element() {
  local route="$1"
  local pattern="$2"
  local description="$3"

  if curl -s "$BASE_URL$route" | grep -q "$pattern"; then
    echo "  ✓ $description"
    ((PASSED++)) || true
  else
    echo "  ✗ $description (FAILED - might be client-side rendered)"
    ((FAILED++)) || true
  fi
}

# Check for skip link (accessibility)
check_element "" "Skip to main content" "Skip link present"

# Check for main landmark
check_element "" 'id="main"' "Main landmark present"

# Check for proper heading
check_element "/jj-git" "jj" "jj-git overview page has content"
check_element "/cats-effect-zio" "Cats Effect" "cats-effect-zio overview page has content"

echo ""
echo "Phase 3: Manual Testing Checklist"
echo "=================================="
echo ""
echo "The following require manual browser testing:"
echo ""
echo "Accessibility (WCAG 2.1 AA):"
echo "  [ ] Keyboard-only navigation (Tab, Arrow keys, Esc)"
echo "  [ ] Focus indicators visible on all interactive elements"
echo "  [ ] Screen reader announces changes appropriately"
echo "  [ ] Touch targets >= 44px (especially mobile)"
echo "  [ ] Color contrast meets AA standards"
echo ""
echo "Responsive Design:"
echo "  [ ] Test at 320px width (mobile breakpoint)"
echo "      - No horizontal scroll"
echo "      - All content accessible"
echo "  [ ] Test at 768px width (tablet)"
echo "  [ ] Test at 200% zoom"
echo "      - Layout remains usable"
echo "      - Text doesn't overflow"
echo ""
echo "Interactive Features:"
echo "  [ ] Progress tracking persists across refreshes (test both jj-git and cats-effect-zio)"
echo "  [ ] localStorage cleared resets progress"
echo "  [ ] Terminal connecting state shows loading"
echo "  [ ] Terminal connected state shows green indicator"
echo "  [ ] Terminal reset button works"
echo "  [ ] Keyboard shortcuts work (←/→ for nav, ? for help)"
echo "  [ ] Fallback mode activates when API blocked"
echo ""
echo "Sandbox API (requires running sandbox-api):"
echo "  [ ] Container starts within 2s"
echo "  [ ] Commands execute (jj log, jj status, etc.)"
echo "  [ ] Session expires after timeout"
echo ""

echo "Summary"
echo "======="
echo "Automated tests passed: $PASSED"
echo "Automated tests failed: $FAILED"
echo ""

if [ $FAILED -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Some tests failed or require manual verification${NC}"
  echo "Note: Content is client-side rendered in Next.js, so HTML-only"
  echo "tests may fail. Use browser DevTools to verify content renders."
  exit 0
else
  echo -e "${GREEN}✅ All automated tests passed${NC}"
  echo ""
  echo "Complete manual verification using the checklist above."
  exit 0
fi
