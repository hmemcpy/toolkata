import { test, expect } from "@playwright/test"

/**
 * Glossary page tests for searchable command reference.
 *
 * Tests cover:
 * - Page loads at /jj-git/cheatsheet (route exists)
 * - All 42 entries render by default (category: All)
 * - Search filters results (query "commit" reduces count)
 * - Category filter works (click "COMMITS" shows only commit entries)
 * - Search + category combine correctly
 * - Empty state shows for no results (query "zzzzzzz")
 * - Copy button exists for each entry
 * - aria-live region announces result count changes
 */

test.describe("Glossary Page", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto("/")
    await page.evaluate(() => localStorage.clear())
  })

  test("page loads at /jj-git/cheatsheet (route exists)", async ({ page }) => {
    const response = await page.goto("/jj-git/cheatsheet")
    expect(response?.status()).toBe(200)

    // Page should have "Cheat Sheet" heading
    await expect(page.locator("h1").filter({ hasText: "Cheat Sheet" })).toBeVisible()

    // Search input should be visible
    await expect(page.locator("input#glossary-search")).toBeVisible()

    // Category tabs should be visible
    await expect(page.locator("text=All")).toBeVisible()
  })

  test("all 42 entries render by default (category: All)", async ({ page }) => {
    await page.goto("/jj-git/cheatsheet")

    // Wait for page to load and hydration to complete
    await page.waitForLoadState("domcontentloaded")

    // Get the result count text
    const countText = await page.locator('[id="search-results-count"]').textContent()

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
    await page.goto("/jj-git/cheatsheet")

    // Wait for page to load
    await page.waitForLoadState("domcontentloaded")

    // Get initial count
    const initialCountText = await page.locator('[id="search-results-count"]').textContent()
    expect(initialCountText).toMatch(/\b42\b/)

    // Type "commit" in search
    const searchInput = page.locator("input#glossary-search")
    await searchInput.fill("commit")

    // Wait for search debounce (300ms) + re-render
    await page.waitForTimeout(500)

    // Count should be reduced (there are fewer than 42 commit-related commands)
    const filteredCountText = await page.locator('[id="search-results-count"]').textContent()
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

  test("category filter works (click 'COMMITS' shows only commit entries)", async ({ page }) => {
    await page.goto("/jj-git/cheatsheet")
    await page.waitForLoadState("domcontentloaded")

    // Get initial count (should be 42)
    const initialCountText = await page.locator('[id="search-results-count"]').textContent()
    expect(initialCountText).toMatch(/\b42\b/)

    // Click COMMITS category tab
    const commitsTab = page.locator("button", { hasText: /^COMMITS$/ }).first()
    await commitsTab.click()

    // Wait for filter to apply
    await page.waitForTimeout(200)

    // Count should be reduced
    const filteredCountText = await page.locator('[id="search-results-count"]').textContent()
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
    await page.goto("/jj-git/cheatsheet")
    await page.waitForLoadState("domcontentloaded")

    // First filter by COMMITS category
    const commitsTab = page.locator("button", { hasText: /^COMMITS$/ }).first()
    await commitsTab.click()
    await page.waitForTimeout(200)

    const commitsCountText = await page.locator('[id="search-results-count"]').textContent()
    const commitsMatch = (commitsCountText ?? "").match(/(\d+) command/)
    const commitsCount = commitsMatch?.[1] ? Number.parseInt(commitsMatch[1], 10) : 0

    // Now search for "log" within COMMITS
    const searchInput = page.locator("input#glossary-search")
    await searchInput.fill("log")
    await page.waitForTimeout(500)

    // Count should be reduced further (intersection of COMMITS + "log")
    const combinedCountText = await page.locator('[id="search-results-count"]').textContent()
    const combinedMatch = (combinedCountText ?? "").match(/(\d+) command/)
    const combinedCount = combinedMatch?.[1] ? Number.parseInt(combinedMatch[1], 10) : 0

    expect(combinedCount).toBeLessThan(commitsCount)
    expect(combinedCount).toBeGreaterThanOrEqual(0)
  })

  test("empty state shows for no results (query 'zzzzzzz')", async ({ page }) => {
    await page.goto("/jj-git/cheatsheet")
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
    const countText = await page.locator('[id="search-results-count"]').textContent()
    expect(countText).toMatch(/\b42\b/)
  })

  test("copy button exists for each entry", async ({ page }) => {
    await page.goto("/jj-git/cheatsheet")
    await page.waitForLoadState("domcontentloaded")

    // Find copy buttons (should be one per entry)
    const copyButtons = page.locator('button[aria-label^="Copy command:"]')

    // Should have copy buttons (one per entry, 42 total)
    const count = await copyButtons.count()
    expect(count).toBe(42)

    // Check first copy button has correct aria-label
    const firstCopyButton = copyButtons.first()
    const ariaLabel = await firstCopyButton.getAttribute("aria-label")

    // The aria-label format is "Copy command: {command}"
    expect(ariaLabel).toMatch(/^Copy command: /)
    expect(ariaLabel?.length).toBeGreaterThan(14) // "Copy command: " + at least 1 char
  })

  test("aria-live region announces result count changes", async ({ page }) => {
    await page.goto("/jj-git/cheatsheet")
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

  test("cheatsheet page link from overview page works", async ({ page }) => {
    await page.goto("/jj-git")

    // Click the cheatsheet link
    const cheatsheetLink = page.locator("a", { hasText: /cheat sheet/i })
    await cheatsheetLink.click()

    // Should navigate to cheatsheet page
    await page.waitForURL("/jj-git/cheatsheet")
    await expect(page.locator("h1").filter({ hasText: "Cheat Sheet" })).toBeVisible()
  })
})
