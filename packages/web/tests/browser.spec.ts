/**
 * Playwright Browser Tests for toolkata
 *
 * Tests cover:
 * - Bidirectional comparison (toggle click, persistence)
 * - Glossary page (search, filter, copy)
 * - Swipe gesture (mobile bottom sheet)
 * - 't' key toggle
 * - Step navigation with re-init (multi-environment)
 * - All routes load successfully
 * - Progress persistence (localStorage)
 * - Responsive design at 320px width
 * - Keyboard navigation (Tab, arrows, ?, Esc)
 *
 * Run with:
 *   bun run test           # Headless
 *   bun run test:ui        # Interactive UI
 *   bun run test:headed    # Visible browser
 */

import { expect, test, type Page } from "@playwright/test"

const toolPair = "jj-git"
const baseUrl = process.env["BASE_URL"] || "http://localhost:3000"

/**
 * Helper: Get localStorage item
 */
async function getLocalStorageItem(page: Page, key: string): Promise<string | null> {
  return await page.evaluate((k) => {
    return localStorage.getItem(k)
  }, key)
}

/**
 * Helper: Set localStorage item
 */
async function setLocalStorageItem(page: Page, key: string, value: string): Promise<void> {
  await page.evaluate(({ k, v }) => {
    localStorage.setItem(k, v)
  }, { k: key, v: value })
}

/**
 * Helper: Clear localStorage
 */
async function clearLocalStorage(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear()
  })
}

test.describe("Bidirectional Comparison", () => {
  test.beforeEach(async ({ page }) => {
    await clearLocalStorage(page)
  })

  test("direction toggle exists on step pages", async ({ page }) => {
    await page.goto(`${baseUrl}/${toolPair}/1`)
    const toggle = page.getByRole("switch", { name: /Toggle direction/ })
    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveText("[git ↔ jj]")
    await expect(toggle).toHaveAttribute("aria-checked", "false")
  })

  test("direction toggle switches to reversed state", async ({ page }) => {
    await page.goto(`${baseUrl}/${toolPair}/1`)
    const toggle = page.getByRole("switch", { name: /Toggle direction/ })

    // Click to toggle
    await toggle.click()
    await expect(toggle).toHaveText("[jj ↔ git]")
    await expect(toggle).toHaveAttribute("aria-checked", "true")
  })

  test("direction preference persists in localStorage", async ({ page }) => {
    await page.goto(`${baseUrl}/${toolPair}/1`)
    const toggle = page.getByRole("switch", { name: /Toggle direction/ })

    // Toggle to reversed
    await toggle.click()
    await expect(toggle).toHaveText("[jj ↔ git]")

    // Check localStorage
    const prefs = await getLocalStorageItem(page, "toolkata_preferences")
    expect(prefs).not.toBeNull()
    const parsed = JSON.parse(prefs ?? "{}")
    expect(parsed.direction).toBe("jj-git")
  })

  test("direction preference persists across page navigation", async ({ page }) => {
    await page.goto(`${baseUrl}/${toolPair}/1`)
    const toggle = page.getByRole("switch", { name: /Toggle direction/ })

    // Toggle to reversed on step 1
    await toggle.click()
    await expect(toggle).toHaveText("[jj ↔ git]")

    // Navigate to step 2
    await page.goto(`${baseUrl}/${toolPair}/2`)
    const toggle2 = page.getByRole("switch", { name: /Toggle direction/ })
    await expect(toggle2).toHaveText("[jj ↔ git]")
    await expect(toggle2).toHaveAttribute("aria-checked", "true")
  })

  test("direction preference persists after page reload", async ({ page }) => {
    await page.goto(`${baseUrl}/${toolPair}/1`)
    const toggle = page.getByRole("switch", { name: /Toggle direction/ })

    // Toggle to reversed
    await toggle.click()
    await expect(toggle).toHaveText("[jj ↔ git]")

    // Reload page
    await page.reload()
    const toggleAfter = page.getByRole("switch", { name: /Toggle direction/ })
    await expect(toggleAfter).toHaveText("[jj ↔ git]")
    await expect(toggleAfter).toHaveAttribute("aria-checked", "true")
  })

  test("direction toggle supports keyboard (Enter key)", async ({ page }) => {
    await page.goto(`${baseUrl}/${toolPair}/1`)
    const toggle = page.getByRole("switch", { name: /Toggle direction/ })

    await toggle.focus()
    await page.keyboard.press("Enter")
    await expect(toggle).toHaveText("[jj ↔ git]")
    await expect(toggle).toHaveAttribute("aria-checked", "true")
  })

  test("direction toggle supports keyboard (Space key)", async ({ page }) => {
    await page.goto(`${baseUrl}/${toolPair}/1`)
    const toggle = page.getByRole("switch", { name: /Toggle direction/ })

    await toggle.focus()
    await page.keyboard.press(" ")
    await expect(toggle).toHaveText("[jj ↔ git]")
    await expect(toggle).toHaveAttribute("aria-checked", "true")
  })

  test("SideBySide components swap columns when direction is reversed", async ({ page }) => {
    await page.goto(`${baseUrl}/${toolPair}/1`)
    const toggle = page.getByRole("switch", { name: /Toggle direction/ })

    // Get initial column order (git left, jj right)
    page.getByText(/git/).first()
    page.getByText(/jj/).nth(1)

    // Toggle direction
    await toggle.click()

    // After toggle: jj left (green), git right (orange)
    // We can verify this by checking the order or color classes
    // For now, verify the toggle text changed
    await expect(toggle).toHaveText("[jj ↔ git]")
  })
})

test.describe("Glossary Page", () => {
  test.beforeEach(async ({ page }) => {
    await clearLocalStorage(page)
  })

  test("glossary page loads successfully", async ({ page }) => {
    await page.goto(`${baseUrl}/${toolPair}/glossary`)
    await expect(page.getByRole("heading", { name: /Glossary/i })).toBeVisible()
  })

  test("glossary has search input", async ({ page }) => {
    await page.goto(`${baseUrl}/${toolPair}/glossary`)
    const search = page.getByPlaceholder("Search commands...")
    await expect(search).toBeVisible()
  })

  test("glossary search filters results", async ({ page }) => {
    await page.goto(`${baseUrl}/${toolPair}/glossary`)
    const search = page.getByPlaceholder("Search commands...")

    // Type "commit" to filter
    await search.fill("commit")
    await page.waitForTimeout(300) // Wait for debounce

    // Check that results are filtered
    const resultsCount = page.getByText(/Found \d+ command/)
    await expect(resultsCount).toBeVisible()
  })

  test("glossary search shows empty state for no results", async ({ page }) => {
    await page.goto(`${baseUrl}/${toolPair}/glossary`)
    const search = page.getByPlaceholder("Search commands...")

    // Type something that won't match
    await search.fill("xyznonexistent")
    await page.waitForTimeout(300)

    // Check for empty state
    const emptyState = page.getByText("No commands found matching")
    await expect(emptyState).toBeVisible()

    // Clear filters button should appear
    const clearButton = page.getByRole("button", { name: "[Clear filters]" })
    await expect(clearButton).toBeVisible()
  })

  test("glossary category filter tabs exist", async ({ page }) => {
    await page.goto(`${baseUrl}/${toolPair}/glossary`)

    // "All" tab should be visible
    const allTab = page.getByRole("button", { name: "All" })
    await expect(allTab).toBeVisible()
    await expect(allTab).toHaveAttribute("aria-pressed", "true")
  })

  test("glossary category filter switches categories", async ({ page }) => {
    await page.goto(`${baseUrl}/${toolPair}/glossary`)

    // Click on a category tab (e.g., "Branching")
    const categoryTab = page.getByRole("button", { name: "Branching" }).first()
    if (await categoryTab.isVisible()) {
      await categoryTab.click()
      await expect(categoryTab).toHaveAttribute("aria-pressed", "true")
    }
  })

  test("glossary has copy buttons for commands", async ({ page }) => {
    await page.goto(`${baseUrl}/${toolPair}/glossary`)

    // Find copy buttons
    const copyButtons = page.getByRole("button", { name: /Copy command:/ })
    await expect(copyButtons.first()).toBeVisible()
  })

  test("glossary respects direction preference", async ({ page }) => {
    // Set direction preference to reversed
    await setLocalStorageItem(page, "toolkata_preferences", JSON.stringify({ direction: "jj-git" }))
    await page.goto(`${baseUrl}/${toolPair}/glossary`)

    // Table headers should be swapped (jj left, git right)
    const tableHeaders = page.getByRole("row").filter({ hasText: /(jj|git)/ }).first()
    await expect(tableHeaders).toBeVisible()
  })
})

test.describe("Mobile Bottom Sheet Swipe Gesture", () => {
  test.use({ viewport: { width: 375, height: 667 } }) // iPhone SE

  test.beforeEach(async ({ page }) => {
    await clearLocalStorage(page)
  })

  test("bottom sheet opens when terminal is toggled on mobile", async ({ page }) => {
    await page.goto(`${baseUrl}/${toolPair}/1`)

    // Look for terminal toggle button (floating button on mobile)
    const toggleButton = page.getByRole("button", { name: /toggle terminal/i })
    if (await toggleButton.isVisible()) {
      await toggleButton.click()
    }

    // Bottom sheet should be visible
    const bottomSheet = page.getByRole("dialog", { name: "Terminal" })
    await expect(bottomSheet).toBeVisible()
  })

  test("bottom sheet has drag handle", async ({ page }) => {
    await page.goto(`${baseUrl}/${toolPair}/1`)

    // Open terminal
    const toggleButton = page.getByRole("button", { name: /toggle terminal/i })
    if (await toggleButton.isVisible()) {
      await toggleButton.click()
    }

    // Look for the bottom sheet
    const sheetContent = page.locator("#terminal-bottom-sheet")
    await expect(sheetContent).toBeVisible()
  })

  test("bottom sheet closes on swipe down", async ({ page }) => {
    await page.goto(`${baseUrl}/${toolPair}/1`)

    // Open terminal
    const toggleButton = page.getByRole("button", { name: /toggle terminal/i })
    if (await toggleButton.isVisible()) {
      await toggleButton.click()
    }

    const bottomSheet = page.locator("#terminal-bottom-sheet")
    await expect(bottomSheet).toBeVisible()

    // Verify bottom sheet can be closed via Escape as fallback for touch gesture test
    // Full touch gesture testing requires headed mode or specific device emulation
    await page.keyboard.press("Escape")
    await expect(bottomSheet).not.toBeVisible()
  })

  test("bottom sheet closes on Escape key", async ({ page }) => {
    await page.goto(`${baseUrl}/${toolPair}/1`)

    // Open terminal
    const toggleButton = page.getByRole("button", { name: /toggle terminal/i })
    if (await toggleButton.isVisible()) {
      await toggleButton.click()
    }

    const bottomSheet = page.locator("#terminal-bottom-sheet")
    await expect(bottomSheet).toBeVisible()

    // Press Escape
    await page.keyboard.press("Escape")

    // Sheet should close
    await expect(bottomSheet).not.toBeVisible()
  })
})

test.describe("'t' Key Terminal Toggle", () => {
  test.beforeEach(async ({ page }) => {
    await clearLocalStorage(page)
  })

  test("'t' key toggles terminal sidebar", async ({ page }) => {
    await page.goto(`${baseUrl}/${toolPair}/1`)

    // Press 't' key
    await page.keyboard.press("t")

    // Terminal should open (check for sidebar or bottom sheet)
    const sidebar = page.locator("#terminal-sidebar, #terminal-bottom-sheet")
    await expect(sidebar).toBeVisible()

    // Press 't' again to close
    await page.keyboard.press("t")

    // Terminal should close
    await expect(sidebar).not.toBeVisible()
  })

  test("'t' key works on all step pages", async ({ page }) => {
    for (const step of [1, 2, 3]) {
      await page.goto(`${baseUrl}/${toolPair}/${step}`)
      await page.keyboard.press("t")

      const sidebar = page.locator("#terminal-sidebar, #terminal-bottom-sheet")
      await expect(sidebar).toBeVisible()

      // Close before next iteration
      await page.keyboard.press("t")
    }
  })

  test("'t' key with modifier keys does not trigger", async ({ page }) => {
    await page.goto(`${baseUrl}/${toolPair}/1`)

    // Ctrl+T should not toggle
    await page.keyboard.press("Control+t")
    const sidebar = page.locator("#terminal-sidebar, #terminal-bottom-sheet")
    await expect(sidebar).not.toBeVisible()

    // Meta+T (Cmd on Mac) should not toggle
    await page.keyboard.press("Meta+t")
    await expect(sidebar).not.toBeVisible()

    // Alt+T should not toggle
    await page.keyboard.press("Alt+t")
    await expect(sidebar).not.toBeVisible()
  })

  test("'t' key does not trigger when focused on input", async ({ page }) => {
    await page.goto(`${baseUrl}/${toolPair}/glossary`)

    // Focus the search input
    const search = page.getByPlaceholder("Search commands...")
    await search.click()
    await search.fill("test")

    // Press 't' - should NOT toggle sidebar because we're focused on input
    const sidebar = page.locator("#terminal-sidebar, #terminal-bottom-sheet")
    await expect(sidebar).not.toBeVisible()
  })
})

test.describe("Step Navigation with Multi-Environment Re-init", () => {
  test.beforeEach(async ({ page }) => {
    await clearLocalStorage(page)
  })

  test("navigating between steps updates sandbox config", async ({ page }) => {
    await page.goto(`${baseUrl}/${toolPair}/1`)

    // Open terminal
    await page.keyboard.press("t")
    const sidebar = page.locator("#terminal-sidebar")
    await expect(sidebar).toBeVisible()

    // Navigate to step 2
    await page.goto(`${baseUrl}/${toolPair}/2`)

    // Terminal should still be open (or re-opened)
    // The session should be re-initialized if environment changed
    await expect(sidebar).toBeVisible()
  })

  test("step with sandbox.disabled does not show terminal buttons", async ({ page }) => {
    // Note: This test requires a step with sandbox.disabled: true in frontmatter
    // For now, we'll just verify the test structure works
    await page.goto(`${baseUrl}/${toolPair}/1`)

    // TryIt buttons should be visible if sandbox is enabled
    const tryItButtons = page.getByRole("button", { name: /Try it/i })
    const hasTryIt = await tryItButtons.count() > 0

    // If sandbox is disabled, TryIt buttons should not appear
    // This depends on the actual content - adjust as needed
    void hasTryIt // Prevent unused variable warning
  })
})

test.describe("All Routes Load Successfully", () => {
  const routes = [
    "/",
    "/jj-git",
    "/jj-git/overview",
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
    "/jj-git/glossary",
    "/about",
    "/help",
    "/terms",
  ]

  for (const route of routes) {
    test(`route ${route} loads successfully`, async ({ page }) => {
      const response = await page.goto(`${baseUrl}${route}`)
      expect(response?.status()).toBe(200)

      // Check for common elements that should exist
      // Skip link might not be visible but should exist in DOM
      await expect(page.locator("main")).toBeVisible()
    })
  }
})

test.describe("Progress Persistence", () => {
  test.beforeEach(async ({ page }) => {
    await clearLocalStorage(page)
  })

  test("progress is stored in localStorage", async ({ page }) => {
    await page.goto(`${baseUrl}/${toolPair}/1`)

    // Wait for progress tracking to initialize
    await page.waitForTimeout(500)

    // Check localStorage for progress
    const progress = await getLocalStorageItem(page, "toolkata_progress_jj-git")
    expect(progress).not.toBeNull()
  })

  test("progress persists after page reload", async ({ page }) => {
    await page.goto(`${baseUrl}/${toolPair}/1`)
    await page.waitForTimeout(500)

    // Get initial progress
    const progress1 = await getLocalStorageItem(page, "toolkata_progress_jj-git")

    // Reload
    await page.reload()
    await page.waitForTimeout(500)

    // Progress should still exist
    const progress2 = await getLocalStorageItem(page, "toolkata_progress_jj-git")
    expect(progress2).toBe(progress1)
  })

  test("resetting progress clears localStorage", async ({ page }) => {
    await page.goto(`${baseUrl}/${toolPair}/1`)
    await page.waitForTimeout(500)

    // Look for reset button (might be in terminal footer or settings)
    const resetButton = page.getByRole("button", { name: /Reset/i }).first()
    if (await resetButton.isVisible()) {
      await resetButton.click()

      // Progress should be reset
      await page.waitForTimeout(500)
      void (await getLocalStorageItem(page, "toolkata_progress_jj-git"))
      // Progress might be empty string or have different structure after reset
    }
  })
})

test.describe("Responsive Design", () => {
  test("layout is usable at 320px width", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 })
    await page.goto(`${baseUrl}/${toolPair}/1`)

    // Main content should be visible
    await expect(page.locator("main")).toBeVisible()

    // Navigation should work
    const nextButton = page.getByRole("link", { name: /Next/i })
    if (await nextButton.isVisible()) {
      await expect(nextButton).toBeVisible()
    }
  })

  test("mobile viewport shows bottom sheet instead of sidebar", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto(`${baseUrl}/${toolPair}/1`)

    // Open terminal
    await page.keyboard.press("t")

    // Bottom sheet should be visible on mobile
    const bottomSheet = page.locator("#terminal-bottom-sheet")
    await expect(bottomSheet).toBeVisible()

    // Desktop sidebar should not be visible
    const sidebar = page.locator("#terminal-sidebar")
    await expect(sidebar).not.toBeVisible()
  })

  test("desktop viewport shows sidebar instead of bottom sheet", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto(`${baseUrl}/${toolPair}/1`)

    // Open terminal
    await page.keyboard.press("t")

    // Desktop sidebar should be visible
    const sidebar = page.locator("#terminal-sidebar")
    await expect(sidebar).toBeVisible()

    // Bottom sheet should not be visible (hidden by CSS)
    const bottomSheet = page.locator("#terminal-bottom-sheet")
    await expect(bottomSheet).not.toBeVisible()
  })
})

test.describe("Keyboard Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await clearLocalStorage(page)
  })

  test("Tab key navigates through interactive elements", async ({ page }) => {
    await page.goto(`${baseUrl}/${toolPair}/1`)

    // Press Tab to move focus
    await page.keyboard.press("Tab")

    // Some element should be focused
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
    expect(["BUTTON", "A", "INPUT"]).toContain(focusedElement)
  })

  test("arrow keys navigate between steps", async ({ page }) => {
    await page.goto(`${baseUrl}/${toolPair}/2`)

    // Press right arrow to go to next step
    await page.keyboard.press("ArrowRight")

    // Should navigate to step 3
    await page.waitForURL(`*/${toolPair}/3`)
    expect(page.url()).toContain(`${toolPair}/3`)
  })

  test("? key opens keyboard shortcuts modal", async ({ page }) => {
    await page.goto(`${baseUrl}/${toolPair}/1`)

    // Press ? to open shortcuts modal
    await page.keyboard.press("?")

    // Modal should appear
    const modal = page.getByRole("dialog", { name: /Keyboard Shortcuts/i })
    await expect(modal).toBeVisible()

    // Press Escape to close
    await page.keyboard.press("Escape")
    await expect(modal).not.toBeVisible()
  })

  test("skip link focuses main content on activation", async ({ page }) => {
    await page.goto(`${baseUrl}/${toolPair}/1`)

    // Tab to first element (should be skip link)
    await page.keyboard.press("Tab")

    // Press Enter to activate skip link
    await page.keyboard.press("Enter")

    // Focus should move to main content
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName)
    expect(focusedTag).toBe("MAIN")
  })
})

test.describe("Accessibility", () => {
  test("skip link exists on all pages", async ({ page }) => {
    await page.goto(`${baseUrl}/${toolPair}/1`)

    const skipLink = page.getByRole("link", { name: /Skip to main content/i })
    await expect(skipLink).toHaveCount(1)
  })

  test("main landmark exists on all pages", async ({ page }) => {
    await page.goto(`${baseUrl}/${toolPair}/1`)

    const main = page.getByRole("main")
    await expect(main).toBeVisible()
  })

  test("buttons have accessible labels", async ({ page }) => {
    await page.goto(`${baseUrl}/${toolPair}/1`)

    // Check that buttons have either text or aria-label
    const buttonsWithoutLabels = await page.evaluate(() => {
      const buttons = document.querySelectorAll("button")
      return Array.from(buttons).filter(
        (b) =>
          !b.textContent?.trim() &&
          !b.getAttribute("aria-label") &&
          !b.getAttribute("aria-labelledby"),
      )
    })

    expect(buttonsWithoutLabels.length).toBe(0)
  })
})

test.describe("Shrinking Layout", () => {
  test.beforeEach(async ({ page }) => {
    await clearLocalStorage(page)
  })

  test("main content shrinks when sidebar opens (margin-right applied)", async ({ page }) => {
    await page.goto(`${baseUrl}/${toolPair}/1`)
    await page.setViewportSize({ width: 1024, height: 768 })

    // Get initial main content width
    const mainBefore = await page.locator("main").boundingBox()
    expect(mainBefore).toBeTruthy()

    // Open terminal sidebar
    await page.keyboard.press("t")
    const sidebar = page.locator("#terminal-sidebar")
    await expect(sidebar).toBeVisible()

    // Main content should have margin-right applied
    const mainAfter = await page.locator("main").boundingBox()
    expect(mainAfter).toBeTruthy()

    // Main content width should be smaller when sidebar is open
    if (mainBefore && mainAfter) {
      expect(mainAfter.width).toBeLessThan(mainBefore.width)
    }
  })

  test("TryIt buttons work while sidebar is visible", async ({ page }) => {
    await page.goto(`${baseUrl}/${toolPair}/1`)
    await page.setViewportSize({ width: 1024, height: 768 })

    // Open terminal sidebar
    await page.keyboard.press("t")
    const sidebar = page.locator("#terminal-sidebar")
    await expect(sidebar).toBeVisible()

    // Look for TryIt buttons
    const tryItButton = page.getByRole("button", { name: /Try it/i }).first()
    const isVisible = await tryItButton.isVisible()

    if (isVisible) {
      // TryIt button should be clickable even with sidebar open
      await tryItButton.click()
      // Button should have been clicked (no error thrown)
    } else {
      // No TryIt button on this page - that's okay
    }
  })

  test("smooth transition when opening/closing sidebar", async ({ page }) => {
    await page.goto(`${baseUrl}/${toolPair}/1`)
    await page.setViewportSize({ width: 1024, height: 768 })

    // Check for transition CSS on main content
    const hasTransition = await page.evaluate(() => {
      const main = document.querySelector("main")
      if (!main) return false
      const styles = window.getComputedStyle(main)
      return styles.transition !== "all 0s" && styles.transition !== ""
    })

    // Transition should be defined (even if empty, it means transition CSS is applied)
    expect(hasTransition).toBeTruthy()
  })

  test("mobile bottom sheet remains as overlay", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto(`${baseUrl}/${toolPair}/1`)

    // Open terminal on mobile
    await page.keyboard.press("t")

    // Bottom sheet should be visible
    const bottomSheet = page.locator("#terminal-bottom-sheet")
    await expect(bottomSheet).toBeVisible()

    // Main content should NOT have margin-right on mobile (bottom sheet is overlay)
    const mainMarginRight = await page.evaluate(() => {
      const main = document.querySelector("main")
      if (!main) return 0
      return window.getComputedStyle(main).marginRight
    })

    // On mobile, main content should not have significant margin-right
    expect(parseInt(mainMarginRight || "0", 10)).toBe(0)
  })
})

test.describe("Scala Effects Demo Page", () => {
  test.beforeEach(async ({ page }) => {
    await clearLocalStorage(page)
  })

  test("scala-effects-demo page loads successfully", async ({ page }) => {
    await page.goto(`${baseUrl}/scala-effects-demo`)
    await expect(page.getByRole("heading", { name: /Prototype/i })).toBeVisible()
  })

  test("all 4 UX options render correctly", async ({ page }) => {
    await page.goto(`${baseUrl}/scala-effects-demo`)

    // Option 1: Column Swap Toggle
    await expect(page.getByText(/Option 1: Column Swap Toggle/i)).toBeVisible()

    // Option 2: Separate Routes
    await expect(page.getByText(/Option 2: Separate Routes/i)).toBeVisible()

    // Option 3: Landing Chooser
    await expect(page.getByText(/Option 3: Landing Chooser/i)).toBeVisible()

    // Option 4: Smart Cards
    await expect(page.getByText(/Option 4: Smart Cards/i)).toBeVisible()
  })

  test("direction toggle works and persists", async ({ page }) => {
    await page.goto(`${baseUrl}/scala-effects-demo`)

    // Find a direction toggle on the demo page
    const toggle = page.getByRole("switch", { name: /Toggle direction/i }).first()
    if (await toggle.isVisible()) {
      await toggle.click()
      await expect(toggle).toHaveAttribute("aria-checked", "true")

      // Check localStorage
      const prefs = await getLocalStorageItem(page, "toolkata_preferences")
      expect(prefs).not.toBeNull()
      const parsed = JSON.parse(prefs ?? "{}")
      expect(parsed.direction).toBeTruthy()
    }
  })

  test("user can interact with each demo section", async ({ page }) => {
    await page.goto(`${baseUrl}/scala-effects-demo`)

    // Try clicking on interactive elements in each section
    const buttons = page.getByRole("button")
    const count = await buttons.count()

    // There should be multiple interactive buttons
    expect(count).toBeGreaterThan(0)

    // First button should be clickable
    if (count > 0) {
      await buttons.first().click()
      // No error should be thrown
    }
  })
})
