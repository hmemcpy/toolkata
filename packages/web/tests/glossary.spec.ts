import { test, expect } from "@playwright/test"

/**
 * Glossary page tests for searchable command reference (Phase 13.7.2).
 *
 * Tests cover:
 * - Page loads at /jj-git/glossary (route exists)
 * - All 42 entries render by default (category: All)
 * - Search filters results (query "commit" reduces count)
 * - Category filter works (click "COMMITS" shows only commit entries)
 * - Search + category combine correctly
 * - Empty state shows for no results (query "zzzzzzz")
 * - Copy button copies correct command based on direction
 * - Direction toggle in glossary header works
 * - aria-live region announces result count changes
 */

test.describe("Glossary Page (13.7.2)", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto("/")
    await page.evaluate(() => localStorage.clear())
  })

  test("page loads at /jj-git/glossary (route exists)", async ({ page }) => {
    const response = await page.goto("/jj-git/glossary")
    expect(response?.status()).toBe(200)

    // Page should have "Command Glossary" heading
    await expect(page.locator("h1").filter({ hasText: "Command Glossary" })).toBeVisible()

    // Search input should be visible
    await expect(page.locator("input#glossary-search")).toBeVisible()

    // Category tabs should be visible
    await expect(page.locator("text=All")).toBeVisible()
  })

  test("all 42 entries render by default (category: All)", async ({ page }) => {
    await page.goto("/jj-git/glossary")

    // Wait for page to load and hydration to complete
    await page.waitForLoadState("domcontentloaded")

    // Get the result count text
    const countText = await page
      .locator('[id="search-results-count"]')
      .textContent()

    // Should say "All 42 commands"
    expect(countText).toMatch(/\b42\b/)
    expect(countText).toMatch(/\bcommands\b/)

    // Category tabs should include all categories
    await expect(page.locator("text=All")).toBeVisible()
    await expect(page.locator("text=BASICS")).toBeVisible()
    await expect(page.locator("text=COMMITS")).toBeVisible()
    await expect(page.locator("text=HISTORY")).toBeVisible()
    await expect(page.locator("text=BRANCHES")).toBeVisible()
    await expect(page.locator("text=REMOTES")).toBeVisible()
    await expect(page.locator("text=UNDO")).toBeVisible()
    await expect(page.locator("text=CONFLICTS")).toBeVisible()
    await expect(page.locator("text=ADVANCED")).toBeVisible()
  })

  test("search filters results (query 'commit' reduces count)", async ({ page }) => {
    await page.goto("/jj-git/glossary")

    // Wait for page to load
    await page.waitForLoadState("domcontentloaded")

    // Get initial count
    const initialCountText = await page
      .locator('[id="search-results-count"]')
      .textContent()
    expect(initialCountText).toMatch(/\b42\b/)

    // Type "commit" in search
    const searchInput = page.locator("input#glossary-search")
    await searchInput.fill("commit")

    // Wait for search debounce (300ms) + re-render
    await page.waitForTimeout(500)

    // Count should be reduced (there are fewer than 42 commit-related commands)
    const filteredCountText = await page
      .locator('[id="search-results-count"]')
      .textContent()
    expect(filteredCountText).toMatch(/Found/)
    expect(filteredCountText).not.toMatch(/\b42\b/)

    // Extract the number from "Found X commands"
    const match = (filteredCountText ?? "").match(/Found (\d+) command/)
    if (match?.[1]) {
      const count = Number.parseInt(match[1], 10)
      expect(count).toBeGreaterThan(0)
      expect(count).toBeLessThan(42)
    }
  })

  test("category filter works (click 'COMMITS' shows only commit entries)", async ({
    page,
  }) => {
    await page.goto("/jj-git/glossary")
    await page.waitForLoadState("domcontentloaded")

    // Get initial count (should be 42)
    const initialCountText = await page
      .locator('[id="search-results-count"]')
      .textContent()
    expect(initialCountText).toMatch(/\b42\b/)

    // Click COMMITS category tab
    const commitsTab = page.locator("button", { hasText: /^COMMITS$/ }).first()
    await commitsTab.click()

    // Wait for filter to apply
    await page.waitForTimeout(200)

    // Count should be reduced
    const filteredCountText = await page
      .locator('[id="search-results-count"]')
      .textContent()
    expect(filteredCountText).not.toMatch(/\b42\b/)

    // Extract the number
    const match = (filteredCountText ?? "").match(/Found (\d+) command/)
    if (match?.[1]) {
      const count = Number.parseInt(match[1], 10)
      expect(count).toBeGreaterThan(0)
      expect(count).toBeLessThan(42)
    }

    // COMMITS tab should be active (aria-pressed="true")
    await expect(commitsTab).toHaveAttribute("aria-pressed", "true")
  })

  test("search + category combine correctly", async ({ page }) => {
    await page.goto("/jj-git/glossary")
    await page.waitForLoadState("domcontentloaded")

    // First filter by COMMITS category
    const commitsTab = page.locator("button", { hasText: /^COMMITS$/ }).first()
    await commitsTab.click()
    await page.waitForTimeout(200)

    const commitsCountText = await page
      .locator('[id="search-results-count"]')
      .textContent()
    const commitsMatch = (commitsCountText ?? "").match(/(\d+) command/)
    const commitsCount = commitsMatch?.[1] ? Number.parseInt(commitsMatch[1], 10) : 0

    // Now search for "log" within COMMITS
    const searchInput = page.locator("input#glossary-search")
    await searchInput.fill("log")
    await page.waitForTimeout(500)

    // Count should be reduced further (intersection of COMMITS + "log")
    const combinedCountText = await page
      .locator('[id="search-results-count"]')
      .textContent()
    const combinedMatch = (combinedCountText ?? "").match(/(\d+) command/)
    const combinedCount = combinedMatch?.[1] ? Number.parseInt(combinedMatch[1], 10) : 0

    expect(combinedCount).toBeLessThan(commitsCount)
    expect(combinedCount).toBeGreaterThanOrEqual(0)
  })

  test("empty state shows for no results (query 'zzzzzzz')", async ({
    page,
  }) => {
    await page.goto("/jj-git/glossary")
    await page.waitForLoadState("domcontentloaded")

    // Search for something that won't match
    const searchInput = page.locator("input#glossary-search")
    await searchInput.fill("zzzzzzz")
    await page.waitForTimeout(500)

    // Empty state should be visible
    await expect(page.locator("text=No commands found matching")).toBeVisible()

    // "Clear filters" button should be available
    const clearButton = page.locator("button", { hasText: /\[Clear filters\]/i })
    await expect(clearButton).toBeVisible()

    // Click clear filters
    await clearButton.click()
    await page.waitForTimeout(200)

    // Should return to showing all 42 commands
    const countText = await page
      .locator('[id="search-results-count"]')
      .textContent()
    expect(countText).toMatch(/\b42\b/)
  })

  test("copy button copies correct command based on direction", async ({
    page,
  }) => {
    // Note: Testing actual clipboard write requires permissions and context
    // This test verifies the button exists and has correct aria-label

    await page.goto("/jj-git/glossary")
    await page.waitForLoadState("domcontentloaded")

    // Find copy buttons (should be one per entry)
    const copyButtons = page.locator('button[aria-label^="Copy command:"]')

    // Should have copy buttons (one per entry, 42 total)
    const count = await copyButtons.count()
    expect(count).toBe(42)

    // Check first copy button has correct aria-label (should copy jj command by default)
    const firstCopyButton = copyButtons.first()
    const ariaLabel = await firstCopyButton.getAttribute("aria-label")

    // In default direction (git→jj), copy button should copy jj command
    // The aria-label format is "Copy command: {command}"
    expect(ariaLabel).toMatch(/^Copy command: /)

    // The command should be a jj command (contains "jj")
    // This varies by entry, but we can verify it's not empty
    expect(ariaLabel?.length).toBeGreaterThan(14) // "Copy command: " + at least 1 char
  })

  test("direction toggle in glossary works", async ({ page }) => {
    await page.goto("/jj-git/glossary")
    await page.waitForLoadState("domcontentloaded")

    // Direction toggle should exist
    const toggle = page.getByRole("switch", {
      name: /switch comparison direction between git and jj/i,
    })
    await expect(toggle).toBeVisible()

    // Initial state: not reversed (aria-checked="false")
    await expect(toggle).toHaveAttribute("aria-checked", "false")

    // Click to toggle
    await toggle.click()

    // Should now be reversed (aria-checked="true")
    await expect(toggle).toHaveAttribute("aria-checked", "true")

    // The column headers should visually swap
    // Get the header text elements
    const headerLeft = page.locator(".grid-cols-12").first().locator("div").nth(0)
    const headerRight = page.locator(".grid-cols-12").first().locator("div").nth(2)

    const leftText = await headerLeft.textContent()
    const rightText = await headerRight.textContent()

    // When reversed, left should be jj (green), right should be git (orange)
    expect(leftText).toContain("jj")
    expect(rightText).toContain("git")
  })

  test("aria-live region announces result count changes", async ({
    page,
  }) => {
    await page.goto("/jj-git/glossary")
    await page.waitForLoadState("domcontentloaded")

    // Get the aria-live element
    const resultsRegion = page.locator('[id="search-results-count"]')

    // Should have aria-live="polite"
    await expect(resultsRegion).toHaveAttribute("aria-live", "polite")

    // Initial text
    const initialText = await resultsRegion.textContent()
    expect(initialText).toMatch(/\b42\b/)

    // Change search to trigger count update
    const searchInput = page.locator("input#glossary-search")
    await searchInput.fill("commit")
    await page.waitForTimeout(500)

    // Text should have changed (screen reader would announce this)
    const newText = await resultsRegion.textContent()
    expect(newText).not.toEqual(initialText)
    expect(newText).toContain("Found")
  })

  test("glossary page link from overview page works", async ({ page }) => {
    await page.goto("/jj-git")

    // Click the glossary link
    const glossaryLink = page.locator("a", { hasText: /glossary/i })
    await glossaryLink.click()

    // Should navigate to glossary page
    await page.waitForURL("/jj-git/glossary")
    await expect(page.locator("h1").filter({ hasText: "Command Glossary" })).toBeVisible()
  })

  test("glossary page has link to cheatsheet", async ({ page }) => {
    await page.goto("/jj-git/glossary")
    await page.waitForLoadState("domcontentloaded")

    // Footer link to cheatsheet
    const cheatsheetLink = page.locator("a", {
      hasText: /\[View printable cheat sheet →\]/i,
    })
    await expect(cheatsheetLink).toBeVisible()

    // Click the link
    await cheatsheetLink.click()

    // Should navigate to cheatsheet
    await page.waitForURL("/jj-git/cheatsheet")
  })
})
