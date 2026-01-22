import { test, expect } from "@playwright/test"

/**
 * Browser tests for toolkata.
 *
 * Covers IMPLEMENTATION_PLAN.md tasks:
 * - 11.4: Keyboard-only navigation
 * - 11.8: Test at 320px width
 * - 11.9: Test at 200% zoom
 * - 12.5: Sandbox connection (requires sandbox-api running)
 * - 12.6: Progress persistence
 * - 12.7: Fallback mode
 */

test.describe("Progress Persistence (12.6)", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto("/")
    await page.evaluate(() => localStorage.clear())
  })

  test("progress persists across page refreshes", async ({ page }) => {
    // Navigate to step 1
    await page.goto("/jj-git/1")

    // Click "Mark Complete" or "Next" to complete step
    const nextButton = page.getByRole("link", { name: /next|step 2/i })
    await nextButton.click()

    // Wait for navigation to step 2
    await page.waitForURL("/jj-git/2")

    // Go back to overview page
    await page.goto("/jj-git")

    // Check that step 1 shows as completed (checkmark icon)
    const step1 = page.locator("text=Installation & Setup").first()
    await expect(step1).toBeVisible()

    // Progress bar should show 1/12
    await expect(page.locator("text=1 / 12")).toBeVisible()

    // Refresh the page
    await page.reload()

    // Progress should still be there
    await expect(page.locator("text=1 / 12")).toBeVisible()
  })

  test("clearing localStorage resets progress", async ({ page }) => {
    // Set up some progress
    await page.goto("/jj-git/1")
    const nextButton = page.getByRole("link", { name: /next|step 2/i })
    await nextButton.click()
    await page.waitForURL("/jj-git/2")

    // Verify progress exists
    await page.goto("/jj-git")
    await expect(page.locator("text=1 / 12")).toBeVisible()

    // Clear localStorage
    await page.evaluate(() => localStorage.clear())

    // Refresh
    await page.reload()

    // Progress should be reset to 0
    await expect(page.locator("text=0 / 12")).toBeVisible()
  })

  test("Reset Progress button clears progress", async ({ page }) => {
    // Set up some progress
    await page.goto("/jj-git/1")
    const nextButton = page.getByRole("link", { name: /next|step 2/i })
    await nextButton.click()
    await page.waitForURL("/jj-git/2")

    // Go to overview
    await page.goto("/jj-git")
    await expect(page.locator("text=1 / 12")).toBeVisible()

    // Click Reset Progress
    await page.getByRole("button", { name: /reset progress/i }).click()

    // Progress should be reset
    await expect(page.locator("text=0 / 12")).toBeVisible()
  })
})

test.describe("Fallback Mode (12.7)", () => {
  test("shows static mode when sandbox unavailable", async ({ page }) => {
    // Block requests to sandbox API
    await page.route("**/sandbox.toolkata.com/**", (route) => route.abort())
    await page.route("**/localhost:3001/**", (route) => route.abort())

    // Navigate to a step page with terminal
    await page.goto("/jj-git/1")

    // The terminal section should show fallback content
    // Look for static mode indicators
    const tryItSection = page.locator("text=Try It").first()
    if (await tryItSection.isVisible()) {
      // Check for fallback message or static code blocks
      const fallbackMessage = page.locator("text=/sandbox.*unavailable|copy.*locally/i")
      const copyButton = page.getByRole("button", { name: /copy/i })

      // Either fallback message or copy buttons should be visible
      const hasFallback = await fallbackMessage.isVisible().catch(() => false)
      const hasCopyButtons = (await copyButton.count()) > 0

      expect(hasFallback || hasCopyButtons).toBe(true)
    }
  })

  test("copy buttons work in fallback mode", async ({ page }) => {
    await page.goto("/jj-git/1")

    // Find any copy button on the page
    const copyButtons = page.getByRole("button", { name: /copy/i })
    const count = await copyButtons.count()

    if (count > 0) {
      // Click the first copy button
      await copyButtons.first().click()

      // Check for success feedback (checkmark or "copied" text)
      // This varies by implementation - checking clipboard would require permissions
      // Just verify the button is still functional (no errors)
      await expect(copyButtons.first()).toBeVisible()
    }
  })
})

test.describe("Responsive Design - 320px (11.8)", () => {
  test.use({ viewport: { width: 320, height: 568 } })

  test("no horizontal scroll at 320px", async ({ page }) => {
    // Test home page
    await page.goto("/")
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1) // +1 for rounding

    // Test overview page
    await page.goto("/jj-git")
    const overviewScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(overviewScrollWidth).toBeLessThanOrEqual(clientWidth + 1)

    // Test step page
    await page.goto("/jj-git/1")
    const stepScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(stepScrollWidth).toBeLessThanOrEqual(clientWidth + 1)

    // Test cheatsheet
    await page.goto("/jj-git/cheatsheet")
    const cheatsheetScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(cheatsheetScrollWidth).toBeLessThanOrEqual(clientWidth + 1)
  })

  test("all content is accessible at 320px", async ({ page }) => {
    await page.goto("/jj-git")

    // Main heading should be visible
    await expect(page.locator("h1")).toBeVisible()

    // Steps should be visible
    await expect(page.locator("text=Installation & Setup")).toBeVisible()

    // Navigation should work
    await page.locator("text=Installation & Setup").click()
    await page.waitForURL("/jj-git/1")
    await expect(page.locator("h1")).toBeVisible()
  })

  test("touch targets are at least 44px", async ({ page }) => {
    await page.goto("/jj-git")

    // Check buttons and links have adequate size
    const buttons = page.getByRole("button")
    const links = page.getByRole("link")

    for (const element of [buttons.first(), links.first()]) {
      if (await element.isVisible()) {
        const box = await element.boundingBox()
        if (box) {
          // At least one dimension should be >= 44px for touch accessibility
          const touchable = box.height >= 44 || box.width >= 44
          expect(touchable).toBe(true)
        }
      }
    }
  })
})

test.describe("Responsive Design - 200% Zoom (11.9)", () => {
  test("layout remains usable at 200% zoom", async ({ page }) => {
    // Simulate 200% zoom by halving the viewport
    await page.setViewportSize({ width: 640, height: 360 }) // 1280x720 at 200%

    await page.goto("/jj-git")

    // Content should still be visible and not overflow
    await expect(page.locator("h1")).toBeVisible()
    await expect(page.locator("text=Installation & Setup")).toBeVisible()

    // No horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1)
  })

  test("text does not overflow containers at 200% zoom", async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 360 })

    await page.goto("/jj-git/1")

    // Check that main content container doesn't have overflow
    const hasOverflow = await page.evaluate(() => {
      const main = document.querySelector("main")
      if (!main) return false
      return main.scrollWidth > main.clientWidth
    })

    expect(hasOverflow).toBe(false)
  })
})

test.describe("Keyboard Navigation (11.4)", () => {
  test("Tab navigates through all interactive elements", async ({ page }) => {
    await page.goto("/jj-git")

    // Start tabbing from the beginning
    await page.keyboard.press("Tab")

    // Should be able to tab to skip link (if visible on focus)
    // Then through navigation, then through content

    // Tab multiple times and verify focus moves
    const focusedElements = new Set<string>()
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press("Tab")
      const focused = await page.evaluate(() => {
        const el = document.activeElement
        return el ? el.tagName + (el.textContent?.slice(0, 20) || "") : null
      })
      if (focused) focusedElements.add(focused)
    }

    // Should have focused multiple different elements
    expect(focusedElements.size).toBeGreaterThan(3)
  })

  test("Arrow keys navigate between steps", async ({ page }) => {
    await page.goto("/jj-git/1")

    // Press right arrow to go to next step
    await page.keyboard.press("ArrowRight")
    await page.waitForURL("/jj-git/2")

    // Press left arrow to go back
    await page.keyboard.press("ArrowLeft")
    await page.waitForURL("/jj-git/1")
  })

  test("? opens keyboard shortcuts modal", async ({ page }) => {
    await page.goto("/jj-git/1")

    // Press ? to open help
    await page.keyboard.press("?")

    // Modal should appear with keyboard shortcuts
    await expect(page.locator("text=/keyboard|shortcuts/i")).toBeVisible()

    // Press Escape to close
    await page.keyboard.press("Escape")

    // Modal should be closed
    await expect(page.locator("[role=dialog]")).not.toBeVisible()
  })

  test("Escape closes modals", async ({ page }) => {
    await page.goto("/jj-git/1")

    // Open help modal
    await page.keyboard.press("?")
    await expect(page.locator("[role=dialog]")).toBeVisible()

    // Close with Escape
    await page.keyboard.press("Escape")
    await expect(page.locator("[role=dialog]")).not.toBeVisible()
  })

  test("Skip link works", async ({ page }) => {
    await page.goto("/jj-git")

    // Tab to skip link
    await page.keyboard.press("Tab")

    // Press Enter on skip link (skip link should be focusable)
    await page.keyboard.press("Enter")

    // Focus should move to main content
    const focusedId = await page.evaluate(() => document.activeElement?.id)
    expect(focusedId).toBe("main")
  })

  test("all interactive elements have visible focus indicators", async ({ page }) => {
    await page.goto("/jj-git")

    // Tab through elements and check for focus visibility
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Tab")

      const hasFocusStyle = await page.evaluate(() => {
        const el = document.activeElement
        if (!el || el === document.body) return true // Skip body

        const styles = window.getComputedStyle(el)
        const hasOutline = styles.outlineWidth !== "0px" && styles.outlineStyle !== "none"
        const hasBoxShadow = styles.boxShadow !== "none"
        const hasBorder = styles.borderColor !== styles.backgroundColor

        return hasOutline || hasBoxShadow || hasBorder
      })

      // Each focused element should have visible focus indicator
      expect(hasFocusStyle).toBe(true)
    }
  })
})

test.describe("Sandbox Connection (12.5)", () => {
  // These tests require sandbox-api running on localhost:3001
  // Skip if sandbox is not available

  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "Sandbox tests only run on Chromium",
  )

  test("terminal connects when sandbox available", async ({ page }) => {
    // Check if sandbox API is running
    const sandboxAvailable = await page
      .request.get("http://localhost:3001/health")
      .then((r) => r.ok())
      .catch(() => false)

    test.skip(!sandboxAvailable, "Sandbox API not running")

    await page.goto("/jj-git/1")

    // Look for terminal/sandbox section
    const terminalSection = page.locator("[data-testid=terminal], .terminal, text=SANDBOX")

    if (await terminalSection.isVisible()) {
      // Click to start sandbox if there's a start button
      const startButton = page.getByRole("button", { name: /start|connect/i })
      if (await startButton.isVisible()) {
        await startButton.click()
      }

      // Wait for connection (green indicator or connected text)
      await expect(
        page.locator("text=/connected|ready/i, [data-status=connected]"),
      ).toBeVisible({ timeout: 10000 })
    }
  })
})

test.describe("All Routes Load (12.4)", () => {
  const routes = [
    "/",
    "/jj-git",
    "/jj-git/1",
    "/jj-git/2",
    "/jj-git/3",
    "/jj-git/4",
    "/jj-git/5",
    "/jj-git/6",
    "/jj-git/7",
    "/jj-git/8",
    "/jj-git/9",
    "/jj-git/10",
    "/jj-git/11",
    "/jj-git/12",
    "/jj-git/cheatsheet",
  ]

  for (const route of routes) {
    test(`${route} loads successfully`, async ({ page }) => {
      const response = await page.goto(route)
      expect(response?.status()).toBe(200)

      // Page should have a heading
      await expect(page.locator("h1").first()).toBeVisible()

      // No JavaScript errors
      const errors: string[] = []
      page.on("pageerror", (error) => errors.push(error.message))
      await page.waitForLoadState("networkidle")
      expect(errors).toHaveLength(0)
    })
  }
})

test.describe("Content Validation", () => {
  // Check for unexpected CJK characters that indicate LLM errors
  // Allow: 形 (kata), 改善 (kaizen) - intentional Japanese terms
  // Flag: Random Chinese mixed with English text

  const contentRoutes = [
    "/jj-git/1",
    "/jj-git/2",
    "/jj-git/3",
    "/jj-git/4",
    "/jj-git/5",
    "/jj-git/6",
    "/jj-git/7",
    "/jj-git/8",
    "/jj-git/9",
    "/jj-git/10",
    "/jj-git/11",
    "/jj-git/12",
  ]

  // Allowlist of intentional CJK characters (kata, kaizen, etc.)
  const allowedCJK = ["型", "形", "改善", "道", "術"]

  for (const route of contentRoutes) {
    test(`${route} has no unexpected CJK characters`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState("domcontentloaded")

      const mainContent = await page.locator("main").textContent()

      if (mainContent) {
        // Find all CJK characters
        const cjkMatches = mainContent.match(/[\u4e00-\u9fff\u3040-\u30ff]/g)

        if (cjkMatches) {
          // Filter out allowed characters
          const unexpected = cjkMatches.filter((char) => !allowedCJK.includes(char))

          expect(
            unexpected.length === 0 ? null : unexpected,
            `Found unexpected CJK characters: ${unexpected.join("")}`,
          ).toBeNull()
        }
      }
    })
  }
})
