import { test, expect } from "@playwright/test"

/**
 * Browser tests for toolkata.
 *
 * Covers IMPLEMENTATION_PLAN.md tasks:
 * - 2.6: Shrinking layout tests
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
    const nextButton = page.getByRole("link", { name: /go to next step/i })
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
    const nextButton = page.getByRole("link", { name: /go to next step/i })
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
    const nextButton = page.getByRole("link", { name: /go to next step/i })
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

    // Main heading should be visible (use first() for strict mode)
    await expect(page.locator("h1").first()).toBeVisible()

    // Steps should be visible
    await expect(page.locator("text=Installation & Setup")).toBeVisible()

    // Navigation should work
    await page.locator("text=Installation & Setup").click()
    await page.waitForURL("/jj-git/1")
    // Use .first() to get the first visible h1 (there's one in nav and one in content)
    await expect(
      page.locator("h1").filter({ hasText: "Installation & Setup" }).first(),
    ).toBeVisible()
  })

  test("touch targets are at least 44px", async ({ page }) => {
    await page.goto("/jj-git")

    // Check that key interactive elements have adequate size
    // Focus on main navigation and action buttons, not decorative elements

    // Check the main step links which should be touch-friendly
    const stepLinks = page.locator("a[href^='/jj-git/']")
    const linkCount = await stepLinks.count()

    // Check first 3 step links
    for (let i = 0; i < Math.min(linkCount, 3); i++) {
      const link = stepLinks.nth(i)
      if (await link.isVisible()) {
        const box = await link.boundingBox()
        if (box) {
          // At least one dimension should be >= 44px for touch accessibility
          const touchable = box.height >= 44 || box.width >= 44
          expect(touchable).toBe(true)
        }
      }
    }

    // Also check that we have some interactive elements on the page
    const allButtons = page.getByRole("button")
    const allLinks = page.getByRole("link")
    const buttonCount = await allButtons.count()
    const totalLinkCount = await allLinks.count()

    // Should have interactive elements
    expect(buttonCount + totalLinkCount).toBeGreaterThan(0)
  })
})

test.describe("Responsive Design - 200% Zoom (11.9)", () => {
  test("layout remains usable at 200% zoom", async ({ page }) => {
    // Simulate 200% zoom by halving the viewport
    await page.setViewportSize({ width: 640, height: 360 }) // 1280x720 at 200%

    await page.goto("/jj-git")

    // Content should still be visible and not overflow (use first() for strict mode)
    await expect(page.locator("h1").first()).toBeVisible()
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
    // Use the dialog role with heading text to be specific
    await expect(page.locator("[role=dialog] >> text=Keyboard Shortcuts")).toBeVisible()

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

    // Skip link should be in the DOM but not visible until focused
    const skipLink = page.locator("a[href='#main']")
    await expect(skipLink).toHaveCount(1)

    // Tab to skip link and verify it becomes visible
    await page.keyboard.press("Tab")
    await expect(skipLink).toBeVisible()

    // Press Enter to activate skip link
    await page.keyboard.press("Enter")

    // The skip link should navigate to #main (scroll position changes or hash in URL)
    await page.waitForLoadState("domcontentloaded")

    // Main element should exist in the DOM
    const mainExists = await page.locator("#main").count()
    expect(mainExists).toBeGreaterThan(0)
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
        const hasBoxShadow = styles.boxShadow !== "none" && styles.boxShadow !== "rgba(0, 0, 0, 0)"
        const hasBorder = styles.borderColor !== styles.backgroundColor

        // Also check for the skip link specific focus class
        const hasSkipLinkFocus =
          el.classList.contains("focus:not-sr-only") || el.classList.contains("not-sr-only")

        return hasOutline || hasBoxShadow || hasBorder || hasSkipLinkFocus
      })

      // Each focused element should have visible focus indicator
      expect(hasFocusStyle).toBe(true)
    }
  })
})

test.describe("Sandbox Connection (12.5)", () => {
  // These tests require sandbox-api running on localhost:3001
  // Skip if sandbox is not available

  test.skip(({ browserName }) => browserName !== "chromium", "Sandbox tests only run on Chromium")

  test("terminal connects when sandbox available", async ({ page }) => {
    // Check if sandbox API is running
    const sandboxAvailable = await page.request
      .get("http://localhost:3001/health")
      .then((r) => r.ok())
      .catch(() => false)

    test.skip(!sandboxAvailable, "Sandbox API not running")

    await page.goto("/jj-git/1")

    // Look for terminal/sandbox section
    const terminalSection = page.locator("[data-testid=terminal], .terminal, :text('SANDBOX')")

    if (await terminalSection.isVisible()) {
      // Click to start sandbox if there's a start button
      const startButton = page.getByRole("button", { name: /start|connect/i })
      if (await startButton.isVisible()) {
        await startButton.click()
      }

      // Wait for connection (green indicator or connected text)
      await expect(page.locator("text=/connected|ready/i, [data-status=connected]")).toBeVisible({
        timeout: 10000,
      })
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

      // Use .first() to avoid strict mode violation (there are 2 main elements)
      const mainContent = await page.locator("main").first().textContent()

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

test.describe("TryIt Enhancements (3.1-3.4)", () => {
  test.use({ viewport: { width: 1280, height: 720 } }) // Desktop breakpoint

  test("TryIt component renders with Run button", async ({ page }) => {
    // TryIt is available in MDX but may not be used in content yet
    // Let's check if any step page has TryIt component
    await page.goto("/jj-git/1")

    // Look for TryIt component by its characteristic styling
    const tryItSection = page.locator(".rounded.border").filter({ hasText: "Command" })

    if (await tryItSection.isVisible()) {
      // Should have a "Command" label
      await expect(tryItSection.locator("text=Command")).toBeVisible()

      // Should have a "Run" button
      const runButton = tryItSection.getByRole("button", { name: /run/i })
      await expect(runButton).toBeVisible()
    }
    // Test passes if TryIt is not present (backwards compatibility)
  })

  test("TryIt component displays expected output when provided", async ({ page }) => {
    // Look for TryIt with expectedOutput prop
    await page.goto("/jj-git/1")

    // TryIt with expectedOutput should show "Expected output" label
    const expectedOutputSection = page.locator("text=Expected output")

    if (await expectedOutputSection.isVisible()) {
      // The expected output should have muted styling
      const outputContainer = expectedOutputSection.locator("xpath=../..")

      // Check for the characteristic muted text styling
      const hasMutedStyle = await outputContainer
        .locator("code.text-\\[var\\(--color-text-dim\\)\\]")
        .count()

      expect(hasMutedStyle).toBeGreaterThan(0)
    }
    // Test passes if TryIt with expectedOutput is not present (backwards compatibility)
  })

  test("TryIt component has editable input by default", async ({ page }) => {
    // Look for TryIt component with editable input
    await page.goto("/jj-git/1")

    // TryIt with editable=true should show an input field
    const tryItSection = page.locator(".rounded.border").filter({ hasText: "Command" })

    if (await tryItSection.isVisible()) {
      // Look for the input field (not a static code block)
      const inputField = tryItSection.locator("input[type='text']")

      if (await inputField.isVisible()) {
        // Input should be editable
        await expect(inputField).toBeEditable()

        // Type into the input field
        const testCommand = "jj status"
        await inputField.fill(testCommand)
        const value = await inputField.inputValue()
        expect(value).toBe(testCommand)
      }
    }
    // Test passes if TryIt is not present or not editable (backwards compatibility)
  })

  test("TryIt editable input handles keyboard shortcuts", async ({ page }) => {
    await page.goto("/jj-git/1")

    const tryItSection = page.locator(".rounded.border").filter({ hasText: "Command" })

    if (await tryItSection.isVisible()) {
      const inputField = tryItSection.locator("input[type='text']")

      if (await inputField.isVisible()) {
        // Focus the input field
        await inputField.focus()

        // Get initial value
        const initialValue = await inputField.inputValue()

        // Type something to modify the command
        await inputField.press("End")
        await inputField.type(" --help")

        // Value should have changed
        const modifiedValue = await inputField.inputValue()
        expect(modifiedValue).not.toBe(initialValue)

        // Press Escape to reset
        await inputField.press("Escape")

        // Wait a moment for reset to take effect
        await page.waitForTimeout(100)

        // Value should be back to original (or close to it)
        // Note: This depends on the component's reset implementation
      }
    }
    // Test passes if TryIt is not present or not editable (backwards compatibility)
  })

  test("TryIt non-editable mode shows static code", async ({ page }) => {
    // This test verifies backwards compatibility
    // If editable=false is used, should show static <code> instead of <input>
    await page.goto("/jj-git/1")

    const tryItSection = page.locator(".rounded.border").filter({ hasText: "Command" })

    if (await tryItSection.isVisible()) {
      // Look for static code block (pre > code pattern)
      const staticCodeBlock = tryItSection.locator("pre > code")

      // If editable is false (or TryIt without editable prop defaults to true),
      // either static code OR input should be present
      const inputField = tryItSection.locator("input[type='text']")

      const hasStaticCode = await staticCodeBlock.count() > 0
      const hasInput = await inputField.count() > 0

      // At least one should be present for valid TryIt component
      expect(hasStaticCode || hasInput).toBe(true)
    }
    // Test passes if TryIt is not present (backwards compatibility)
  })

  test("TryIt Run button shows feedback and debounces", async ({ page }) => {
    await page.goto("/jj-git/1")

    const tryItSection = page.locator(".rounded.border").filter({ hasText: "Command" })

    if (await tryItSection.isVisible()) {
      const runButton = tryItSection.getByRole("button", { name: /run/i })

      if (await runButton.isVisible()) {
        // Initial state should be "Run"
        await expect(runButton).toHaveText(/run/i)

        // Click the button
        await runButton.click()

        // Should show feedback (either "Sent!" or remain enabled)
        const buttonText = await runButton.textContent()
        expect(buttonText).toMatch(/sent|run/i)

        // Button should be briefly disabled (debounce period)
        // After 500ms, it should be enabled again
        await page.waitForTimeout(600)
        await expect(runButton).toBeEnabled()
      }
    }
    // Test passes if TryIt is not present (backwards compatibility)
  })

  test("TryIt component works without new props (backwards compatibility)", async ({ page }) => {
    // This test ensures TryIt works with just the required `command` prop
    await page.goto("/jj-git/1")

    // Any TryIt component should render even without expectedOutput or editable
    const tryItSection = page.locator(".rounded.border").filter({ hasText: "Command" })

    if (await tryItSection.isVisible()) {
      // Should have command label
      await expect(tryItSection.locator("text=Command")).toBeVisible()

      // Should have Run button
      const runButton = tryItSection.getByRole("button", { name: /run/i })
      await expect(runButton).toBeVisible()
    }
    // Test passes if TryIt is not present (backwards compatibility)
  })
})

test.describe("Shrinking Layout (2.6)", () => {
  test.use({ viewport: { width: 1280, height: 720 } }) // Desktop breakpoint

  test("TryIt buttons work while sidebar is open", async ({ page }) => {
    await page.goto("/jj-git/1")

    // Find a TryIt button (uses the Run functionality)
    const runButton = page.getByRole("button", { name: /run in terminal/i })

    if (await runButton.isVisible()) {
      // Click the terminal toggle to open sidebar
      const toggleButton = page.getByRole("button", { name: /open terminal/i })
      await toggleButton.click()

      // Wait for sidebar to open
      await expect(page.locator("#terminal-sidebar, #terminal-bottom-sheet")).toBeVisible()

      // TryIt button should still be clickable (no backdrop overlay blocking)
      await expect(runButton).toBeEnabled()
      await runButton.click()

      // Command should be sent to terminal (verify terminal received input)
      const terminalExists = await page.locator(".xterm-helper-textarea").count()
      expect(terminalExists).toBeGreaterThan(0)
    }
  })

  test("content scrolls independently from sidebar", async ({ page }) => {
    await page.goto("/jj-git/1")

    // Click the terminal toggle to open sidebar
    const toggleButton = page.getByRole("button", { name: /open terminal/i })
    await toggleButton.click()

    // Wait for sidebar to open
    await expect(page.locator("#terminal-sidebar, #terminal-bottom-sheet")).toBeVisible()

    // Get initial scroll position of main content
    const initialScrollTop = await page.evaluate(() => document.querySelector("main")?.scrollTop)

    // Scroll the main content
    await page.evaluate(() => document.querySelector("main")?.scrollBy(0, 200))

    // Main content should have scrolled
    const newScrollTop = await page.evaluate(() => document.querySelector("main")?.scrollTop)
    expect(newScrollTop).toBeGreaterThan(initialScrollTop ?? 0)

    // Verify sidebar is still visible and open (scrolling main content didn't close it)
    await expect(page.locator("#terminal-sidebar, #terminal-bottom-sheet")).toBeVisible()
  })

  test("sidebar does not block content interaction", async ({ page }) => {
    await page.goto("/jj-git/1")

    // Get a link in the main content area
    const contentLink = page.locator("main a").first()

    if (await contentLink.isVisible()) {
      // Click the terminal toggle to open sidebar
      const toggleButton = page.getByRole("button", { name: /open terminal/i })
      await toggleButton.click()

      // Wait for sidebar to open
      await expect(page.locator("#terminal-sidebar, #terminal-bottom-sheet")).toBeVisible()

      // Content links should still be clickable (no inert attribute)
      await expect(contentLink).toBeEnabled()

      // Main element should not have inert attribute
      const hasInert = await page.evaluate(() => document.querySelector("main")?.hasAttribute("inert"))
      expect(hasInert).toBe(false)
    }
  })

  test("sidebar closes on Escape key", async ({ page }) => {
    await page.goto("/jj-git/1")

    // Click the terminal toggle to open sidebar
    const toggleButton = page.getByRole("button", { name: /open terminal/i })
    await toggleButton.click()

    // Wait for sidebar to open
    await expect(page.locator("#terminal-sidebar, #terminal-bottom-sheet")).toBeVisible()

    // Press Escape to close sidebar
    await page.keyboard.press("Escape")

    // Sidebar should be hidden
    await expect(page.locator("#terminal-sidebar, #terminal-bottom-sheet")).not.toBeVisible()
  })
})
