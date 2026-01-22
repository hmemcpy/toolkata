import { test, expect } from "@playwright/test"

/**
 * Direction toggle tests for bidirectional comparison (Phase 13.7.1).
 *
 * Tests cover:
 * - Toggle click changes visual state (columns swap)
 * - Toggle click persists to localStorage
 * - Preference survives page refresh (no flash of default)
 * - Preference applies across pages (step → cheatsheet → glossary)
 * - Keyboard activation (Enter/Space)
 * - ARIA attributes update (aria-checked)
 * - Default direction is git→jj when localStorage empty
 */

test.describe("Direction Toggle (13.7.1)", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto("/")
    await page.evaluate(() => localStorage.clear())
  })

  test("default direction is git→jj when localStorage empty", async ({ page }) => {
    await page.goto("/jj-git/1")

    // Direction toggle button should exist
    const toggle = page.getByRole("switch", {
      name: /switch comparison direction between git and jj/i,
    })
    await expect(toggle).toBeVisible()

    // aria-checked should be false (not reversed = default git→jj)
    await expect(toggle).toHaveAttribute("aria-checked", "false")

    // Visual check: git should be muted (left), jj should be green (right)
    const gitSpan = page.locator("button[role=switch]").getByText("git", { exact: true })
    const jjSpan = page.locator("button[role=switch]").getByText("jj", { exact: true })

    // git should have muted color (not accent)
    await expect(gitSpan).toHaveCSS("color", /rgb\(161, 161, 161\)/)
    // jj should have accent color (green)
    await expect(jjSpan).toHaveCSS("color", /rgb\(34, 197, 94\)/)
  })

  test("toggle click changes visual state to reversed", async ({ page }) => {
    await page.goto("/jj-git/1")

    const toggle = page.getByRole("switch", {
      name: /switch comparison direction between git and jj/i,
    })

    // Initial state: not reversed
    await expect(toggle).toHaveAttribute("aria-checked", "false")

    // Click to toggle
    await toggle.click()

    // After toggle: aria-checked should be true (reversed)
    await expect(toggle).toHaveAttribute("aria-checked", "true")

    // Visual check: jj should be muted (now on left), git should be orange (on right)
    const gitSpan = page.locator("button[role=switch]").getByText("git", { exact: true })
    const jjSpan = page.locator("button[role=switch]").getByText("jj", { exact: true })

    // jj should now be muted
    await expect(jjSpan).toHaveCSS("color", /rgb\(161, 161, 161\)/)
    // git should now be accent-alt (orange)
    await expect(gitSpan).toHaveCSS("color", /rgb\(249, 115, 22\)/)
  })

  test("toggle click persists to localStorage", async ({ page }) => {
    await page.goto("/jj-git/1")

    const toggle = page.getByRole("switch", {
      name: /switch comparison direction between git and jj/i,
    })

    // Click to toggle to reversed
    await toggle.click()
    await expect(toggle).toHaveAttribute("aria-checked", "true")

    // Check localStorage was updated
    const preferences = await page.evaluate(() => {
      const data = localStorage.getItem("toolkata_preferences")
      return data ? JSON.parse(data) : null
    })

    expect(preferences).not.toBeNull()
    expect(preferences?.direction).toBe("reversed")
    expect(preferences?.version).toBe(1)
  })

  test("preference survives page refresh (no flash of default)", async ({ page }) => {
    // Set direction to reversed
    await page.goto("/jj-git/1")
    const toggle = page.getByRole("switch", {
      name: /switch comparison direction between git and jj/i,
    })
    await toggle.click()
    await expect(toggle).toHaveAttribute("aria-checked", "true")

    // Refresh the page
    await page.reload()

    // Wait for page to fully load
    await page.waitForLoadState("domcontentloaded")

    // Toggle should still be reversed after refresh
    const toggleAfter = page.getByRole("switch", {
      name: /switch comparison direction between git and jj/i,
    })
    await expect(toggleAfter).toBeVisible()
    await expect(toggleAfter).toHaveAttribute("aria-checked", "true")
  })

  test("preference applies across pages (step → cheatsheet → glossary)", async ({ page }) => {
    // Start on step page, set to reversed
    await page.goto("/jj-git/1")
    const toggle = page.getByRole("switch", {
      name: /switch comparison direction between git and jj/i,
    })
    await toggle.click()
    await expect(toggle).toHaveAttribute("aria-checked", "true")

    // Navigate to cheatsheet
    await page.goto("/jj-git/cheatsheet")

    // Direction should still be reversed on cheatsheet
    const cheatsheetToggle = page.getByRole("switch", {
      name: /switch comparison direction between git and jj/i,
    })
    await expect(cheatsheetToggle).toBeVisible()
    await expect(cheatsheetToggle).toHaveAttribute("aria-checked", "true")

    // Navigate to glossary
    await page.goto("/jj-git/glossary")

    // Direction should still be reversed on glossary
    const glossaryToggle = page.getByRole("switch", {
      name: /switch comparison direction between git and jj/i,
    })
    await expect(glossaryToggle).toBeVisible()
    await expect(glossaryToggle).toHaveAttribute("aria-checked", "true")
  })

  test("keyboard activation with Enter", async ({ page }) => {
    await page.goto("/jj-git/1")

    const toggle = page.getByRole("switch", {
      name: /switch comparison direction between git and jj/i,
    })

    // Focus the toggle
    await toggle.focus()
    await expect(toggle).toBeFocused()

    // Initial state
    await expect(toggle).toHaveAttribute("aria-checked", "false")

    // Press Enter to toggle
    await page.keyboard.press("Enter")

    // Should be toggled
    await expect(toggle).toHaveAttribute("aria-checked", "true")
  })

  test("keyboard activation with Space", async ({ page }) => {
    await page.goto("/jj-git/1")

    const toggle = page.getByRole("switch", {
      name: /switch comparison direction between git and jj/i,
    })

    // Focus the toggle
    await toggle.focus()
    await expect(toggle).toBeFocused()

    // Initial state
    await expect(toggle).toHaveAttribute("aria-checked", "false")

    // Press Space to toggle
    await page.keyboard.press(" ")

    // Should be toggled
    await expect(toggle).toHaveAttribute("aria-checked", "true")
  })

  test("SideBySide columns swap when direction reversed", async ({ page }) => {
    await page.goto("/jj-git/3")

    // Find a SideBySide component
    const sideBySide = page.locator(".grid.md\\:grid-cols-2").first()

    // Get initial column labels
    const leftLabel = sideBySide.locator("span").filter({ hasText: /^(git|jj)$/ }).first()
    const rightLabel = sideBySide.locator("span").filter({ hasText: /^(git|jj)$/ }).last()

    // In default direction (git→jj), left should be "git", right should be "jj"
    const initialLeftText = await leftLabel.textContent()
    const initialRightText = await rightLabel.textContent()
    expect(initialLeftText).toBe("git")
    expect(initialRightText).toBe("jj")

    // Toggle direction
    const toggle = page.getByRole("switch", {
      name: /switch comparison direction between git and jj/i,
    })
    await toggle.click()

    // After toggle, columns should be visually swapped
    // In reversed direction (jj→git), left should be "jj", right should be "git"
    const newLeftText = await leftLabel.textContent()
    const newRightText = await rightLabel.textContent()
    expect(newLeftText).toBe("jj")
    expect(newRightText).toBe("git")
  })
})
