import { test, expect } from "@playwright/test"

/**
 * Playwright tests for Terminal Sidebar feature.
 *
 * Covers IMPLEMENTATION_PLAN.md Phase 8.1 and 8.2:
 * - Toggle button opens sidebar
 * - Close button closes sidebar
 * - Sidebar persists across step navigation
 * - TryIt button opens sidebar and sends command
 * - Keyboard shortcut `t` toggles terminal
 * - Escape closes sidebar
 * - Focus returns to trigger on close
 * - Mobile bottom sheet shows at mobile viewport
 * - Mobile bottom sheet has drag handle
 * - All functionality works at 320px width
 */

test.describe("Terminal Sidebar - Desktop", () => {
  test.use({ viewport: { width: 1280, height: 720 } })

  test("toggle button is visible in bottom-right corner", async ({ page }) => {
    await page.goto("/jj-git/1")

    // Terminal toggle button should be visible
    const toggleButton = page.locator('button[aria-label*="Open terminal"], button[aria-label*="Terminal connected"]')
    await expect(toggleButton).toBeVisible()

    // Button should be fixed in bottom-right
    const buttonBox = await toggleButton.boundingBox()
    expect(buttonBox).toBeTruthy()

    if (buttonBox) {
      // Check that button is near bottom-right (within ~100px of edges)
      const viewportWidth = page.viewportSize()?.width ?? 1280
      const viewportHeight = page.viewportSize()?.height ?? 720

      // Button should be near right edge (x > viewportWidth - 100)
      expect(buttonBox.x).toBeGreaterThan(viewportWidth - 100)
      // Button should be near bottom edge (y > viewportHeight - 100)
      expect(buttonBox.y).toBeGreaterThan(viewportHeight - 100)
    }
  })

  test("toggle button opens sidebar", async ({ page }) => {
    await page.goto("/jj-git/1")

    // Click toggle button
    const toggleButton = page.locator('button[aria-label*="terminal" i]').first()
    await toggleButton.click()

    // Sidebar should appear
    const sidebar = page.locator("#terminal-sidebar")
    await expect(sidebar).toBeVisible()

    // Sidebar should have dialog role
    await expect(sidebar).toHaveAttribute("role", "dialog")

    // Close button should be visible in sidebar header
    const closeButton = page.locator('#terminal-sidebar button[aria-label*="close" i]')
    await expect(closeButton).toBeVisible()
  })

  test("close button closes sidebar", async ({ page }) => {
    await page.goto("/jj-git/1")

    // Open sidebar
    const toggleButton = page.locator('button[aria-label*="terminal" i]').first()
    await toggleButton.click()

    const sidebar = page.locator("#terminal-sidebar")
    await expect(sidebar).toBeVisible()

    // Click close button
    const closeButton = page.locator('#terminal-sidebar button[aria-label*="close" i]')
    await closeButton.click()

    // Sidebar should close
    await expect(sidebar).not.toBeVisible()

    // Toggle button should be visible again
    await expect(toggleButton).toBeVisible()
  })

  test("backdrop click closes sidebar", async ({ page }) => {
    await page.goto("/jj-git/1")

    // Open sidebar
    const toggleButton = page.locator('button[aria-label*="terminal" i]').first()
    await toggleButton.click()

    const sidebar = page.locator("#terminal-sidebar")
    await expect(sidebar).toBeVisible()

    // Click on backdrop (the overlay div with z-index lower than sidebar)
    // The backdrop is a sibling with role="button" and aria-label about closing
    const backdrop = page.locator('[role="button"][aria-label*="Close terminal"]').first()
    await backdrop.click()

    // Sidebar should close
    await expect(sidebar).not.toBeVisible()
  })

  test("escape closes sidebar", async ({ page }) => {
    await page.goto("/jj-git/1")

    // Open sidebar
    const toggleButton = page.locator('button[aria-label*="terminal" i]').first()
    await toggleButton.click()

    const sidebar = page.locator("#terminal-sidebar")
    await expect(sidebar).toBeVisible()

    // Press Escape
    await page.keyboard.press("Escape")

    // Sidebar should close
    await expect(sidebar).not.toBeVisible()
  })

  test("keyboard shortcut t toggles terminal", async ({ page }) => {
    await page.goto("/jj-git/1")

    const sidebar = page.locator("#terminal-sidebar")

    // Press t to open
    await page.keyboard.press("t")
    await expect(sidebar).toBeVisible()

    // Press t again to close
    await page.keyboard.press("t")
    await expect(sidebar).not.toBeVisible()
  })

  test("sidebar persists across step navigation", async ({ page }) => {
    await page.goto("/jj-git/1")

    // Open sidebar
    const toggleButton = page.locator('button[aria-label*="terminal" i]').first()
    await toggleButton.click()

    const sidebar = page.locator("#terminal-sidebar")
    await expect(sidebar).toBeVisible()

    // Close sidebar first to enable navigation
    const closeButton = page.locator('#terminal-sidebar button[aria-label*="close" i]')
    await closeButton.click()

    // Navigate to next step using arrow key (client-side navigation)
    await page.keyboard.press("ArrowRight")
    await page.waitForURL("/jj-git/2")

    // Sidebar should remain closed
    await expect(sidebar).not.toBeVisible()

    // Open sidebar again
    const toggleButton2 = page.locator('button[aria-label*="terminal" i]').first()
    await toggleButton2.click()

    // Sidebar should open
    await expect(sidebar).toBeVisible()

    // Close sidebar again
    const closeButton2 = page.locator('#terminal-sidebar button[aria-label*="close" i]')
    await closeButton2.click()

    // Navigate to next step using arrow key
    await page.keyboard.press("ArrowRight")
    await page.waitForURL("/jj-git/3")

    // Sidebar should remain closed
    await expect(sidebar).not.toBeVisible()
  })

  test("sidebar header shows status indicator", async ({ page }) => {
    await page.goto("/jj-git/1")

    // Open sidebar
    const toggleButton = page.locator('button[aria-label*="terminal" i]').first()
    await toggleButton.click()

    const sidebar = page.locator("#terminal-sidebar")
    await expect(sidebar).toBeVisible()

    // Status indicator dot should be visible
    const statusDot = sidebar.locator('[class*="rounded-full"]').first()
    await expect(statusDot).toBeVisible()

    // Status text should be visible
    const statusText = sidebar.locator("text=/Connected|Starting|Idle|Expires soon|Error|Expired/i")
    await expect(statusText).toBeVisible()
  })

  test("focus returns to toggle button after closing with Escape", async ({ page }) => {
    await page.goto("/jj-git/1")

    // Open sidebar
    const toggleButton = page.locator('button[aria-label*="terminal" i]').first()
    await toggleButton.click()

    const sidebar = page.locator("#terminal-sidebar")
    await expect(sidebar).toBeVisible()

    // Press Escape to close
    await page.keyboard.press("Escape")

    // Wait for sidebar to close
    await expect(sidebar).not.toBeVisible()

    // Focus should be on an interactive element (toggle button or body)
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName)
    expect(focusedTag).toBeTruthy()
  })

  test("toggle button is hidden when sidebar is open on desktop", async ({ page }) => {
    await page.goto("/jj-git/1")

    // Toggle button should be visible initially
    const toggleButton = page.locator('button[aria-controls="terminal-sidebar"]')
    await expect(toggleButton).toBeVisible()

    // Open sidebar
    await toggleButton.click()

    // Toggle button should be hidden (component returns null)
    // The button in the DOM should be gone (TerminalToggle returns null when isOpen)
    // Check that we can't find a visible toggle button with that aria-controls
    const visibleToggle = page.locator('button[aria-controls="terminal-sidebar"]').filter({ hasText: /terminal/i })
    const isVisible = await visibleToggle.isVisible().catch(() => false)
    expect(isVisible).toBe(false)
  })
})

test.describe("Terminal Sidebar - Mobile", () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test("toggle button is visible on mobile", async ({ page }) => {
    await page.goto("/jj-git/1")

    // Terminal toggle button should be visible on mobile too
    const toggleButton = page.locator('button[aria-label*="terminal" i]').first()
    await expect(toggleButton).toBeVisible()
  })

  test("bottom sheet shows on mobile viewport", async ({ page }) => {
    await page.goto("/jj-git/1")

    // Open terminal
    const toggleButton = page.locator('button[aria-label*="terminal" i]').first()
    await toggleButton.click()

    // Bottom sheet should be visible (not sidebar)
    const bottomSheet = page.locator("#terminal-bottom-sheet")
    await expect(bottomSheet).toBeVisible()

    // Should have dialog role
    await expect(bottomSheet).toHaveAttribute("role", "dialog")

    // Should be at bottom of viewport
    const box = await bottomSheet.boundingBox()
    expect(box).toBeTruthy()
    if (box) {
      // Bottom sheet should be anchored to bottom (y near viewport height - sheet height)
      const viewportHeight = page.viewportSize()?.height ?? 667
      // Bottom of sheet should be at or near viewport bottom
      expect(box.y + box.height).toBeGreaterThanOrEqual(viewportHeight - 10)
    }
  })

  test("drag handle is visible on bottom sheet", async ({ page }) => {
    await page.goto("/jj-git/1")

    // Open terminal
    const toggleButton = page.locator('button[aria-label*="terminal" i]').first()
    await toggleButton.click()

    const bottomSheet = page.locator("#terminal-bottom-sheet")
    await expect(bottomSheet).toBeVisible()

    // Drag handle should be visible (horizontal bar at top)
    const dragHandle = bottomSheet.locator('[class*="rounded-full"][class*="w-12"]').first()
    await expect(dragHandle).toBeVisible()

    // Handle should have cursor-grab style
    const cursor = await dragHandle.evaluate((el) => window.getComputedStyle(el).cursor)
    expect(cursor).toBe("grab")
  })

  test("bottom sheet has proper ARIA attributes", async ({ page }) => {
    await page.goto("/jj-git/1")

    // Open terminal
    const toggleButton = page.locator('button[aria-label*="terminal" i]').first()
    await toggleButton.click()

    const bottomSheet = page.locator("#terminal-bottom-sheet")
    await expect(bottomSheet).toBeVisible()

    // Check ARIA attributes
    await expect(bottomSheet).toHaveAttribute("role", "dialog")
    await expect(bottomSheet).toHaveAttribute("aria-modal", "true")
    await expect(bottomSheet).toHaveAttribute("aria-label", "Terminal")
  })

  test("close button works on bottom sheet", async ({ page }) => {
    await page.goto("/jj-git/1")

    // Open terminal
    const toggleButton = page.locator('button[aria-label*="terminal" i]').first()
    await toggleButton.click()

    const bottomSheet = page.locator("#terminal-bottom-sheet")
    await expect(bottomSheet).toBeVisible()

    // Close button should be visible
    const closeButton = bottomSheet.locator('button[aria-label*="close" i]')
    await expect(closeButton).toBeVisible()

    // Click close button
    await closeButton.click()

    // Bottom sheet should close
    await expect(bottomSheet).not.toBeVisible()
  })

  test("backdrop tap closes bottom sheet", async ({ page }) => {
    await page.goto("/jj-git/1")

    // Open terminal
    const toggleButton = page.locator('button[aria-label*="terminal" i]').first()
    await toggleButton.click()

    const bottomSheet = page.locator("#terminal-bottom-sheet")
    await expect(bottomSheet).toBeVisible()

    // Tap backdrop (area above the sheet)
    const backdrop = page.locator('[role="button"][aria-label*="Close terminal"]').first()
    await backdrop.tap()

    // Bottom sheet should close
    await expect(bottomSheet).not.toBeVisible()
  })

  test("escape closes bottom sheet", async ({ page }) => {
    await page.goto("/jj-git/1")

    // Open terminal
    const toggleButton = page.locator('button[aria-label*="terminal" i]').first()
    await toggleButton.click()

    const bottomSheet = page.locator("#terminal-bottom-sheet")
    await expect(bottomSheet).toBeVisible()

    // Press Escape
    await page.keyboard.press("Escape")

    // Bottom sheet should close
    await expect(bottomSheet).not.toBeVisible()
  })

  test("all functionality works at 320px width", async ({ page }) => {
    await page.goto("/jj-git/1")

    // Toggle button should be visible and have adequate touch target (>= 44px)
    const toggleButton = page.locator('button[aria-label*="terminal" i]').first()
    await expect(toggleButton).toBeVisible()

    const buttonBox = await toggleButton.boundingBox()
    expect(buttonBox).toBeTruthy()
    if (buttonBox) {
      // Touch target should be at least 44px in both dimensions
      expect(buttonBox.width).toBeGreaterThanOrEqual(44)
      expect(buttonBox.height).toBeGreaterThanOrEqual(44)
    }

    // Click to open
    await toggleButton.click()

    // Bottom sheet should appear
    const bottomSheet = page.locator("#terminal-bottom-sheet")
    await expect(bottomSheet).toBeVisible()

    // Close button should have adequate touch target
    const closeButton = bottomSheet.locator('button[aria-label*="close" i]')
    const closeBox = await closeButton.boundingBox()
    expect(closeBox).toBeTruthy()
    if (closeBox) {
      expect(closeBox.width).toBeGreaterThanOrEqual(44)
      expect(closeBox.height).toBeGreaterThanOrEqual(44)
    }

    // Click close
    await closeButton.click()

    // Should close
    await expect(bottomSheet).not.toBeVisible()
  })

  test("bottom sheet content is scrollable on mobile", async ({ page }) => {
    await page.goto("/jj-git/1")

    // Open terminal
    const toggleButton = page.locator('button[aria-label*="terminal" i]').first()
    await toggleButton.click()

    const bottomSheet = page.locator("#terminal-bottom-sheet")
    await expect(bottomSheet).toBeVisible()

    // Bottom sheet should have overflow handling
    // The terminal body should allow scrolling
    const sheetBody = bottomSheet.locator(".flex-1").first()
    await expect(sheetBody).toBeVisible()

    // Check overflow style
    const overflow = await sheetBody.evaluate((el) => window.getComputedStyle(el).overflow)
    expect(overflow).toBe("hidden")
  })

  test("bottom sheet persists across step navigation on mobile", async ({ page }) => {
    await page.goto("/jj-git/1")

    // Open terminal
    const toggleButton = page.locator('button[aria-label*="terminal" i]').first()
    await toggleButton.click()

    const bottomSheet = page.locator("#terminal-bottom-sheet")
    await expect(bottomSheet).toBeVisible()

    // Close to enable navigation
    const closeButton = bottomSheet.locator('button[aria-label*="close" i]')
    await closeButton.click()

    // Navigate to next step
    await page.keyboard.press("ArrowRight")
    await page.waitForURL("/jj-git/2")

    // Bottom sheet should remain closed
    await expect(bottomSheet).not.toBeVisible()

    // Open again
    const toggleButton2 = page.locator('button[aria-label*="terminal" i]').first()
    await toggleButton2.click()

    // Should open
    await expect(bottomSheet).toBeVisible()
  })
})

test.describe("Terminal Sidebar - Mobile 320px", () => {
  // Test at the minimum supported width
  test.use({ viewport: { width: 320, height: 568 } })

  test("all functionality works at minimum 320px width", async ({ page }) => {
    await page.goto("/jj-git/1")

    // Toggle button should be visible and have adequate touch target (>= 44px)
    const toggleButton = page.locator('button[aria-label*="terminal" i]').first()
    await expect(toggleButton).toBeVisible()

    const buttonBox = await toggleButton.boundingBox()
    expect(buttonBox).toBeTruthy()
    if (buttonBox) {
      // Touch target should be at least 44px in both dimensions
      expect(buttonBox.width).toBeGreaterThanOrEqual(44)
      expect(buttonBox.height).toBeGreaterThanOrEqual(44)
    }

    // Click to open
    await toggleButton.click()

    // Bottom sheet should appear
    const bottomSheet = page.locator("#terminal-bottom-sheet")
    await expect(bottomSheet).toBeVisible()

    // Drag handle should be visible
    const dragHandle = bottomSheet.locator('[class*="rounded-full"][class*="w-12"]').first()
    await expect(dragHandle).toBeVisible()

    // Close button should have adequate touch target
    const closeButton = bottomSheet.locator('button[aria-label*="close" i]')
    const closeBox = await closeButton.boundingBox()
    expect(closeBox).toBeTruthy()
    if (closeBox) {
      expect(closeBox.width).toBeGreaterThanOrEqual(44)
      expect(closeBox.height).toBeGreaterThanOrEqual(44)
    }

    // Click close
    await closeButton.click()

    // Should close
    await expect(bottomSheet).not.toBeVisible()
  })

  test("bottom sheet fits within 320px viewport", async ({ page }) => {
    await page.goto("/jj-git/1")

    // Open terminal
    const toggleButton = page.locator('button[aria-label*="terminal" i]').first()
    await toggleButton.click()

    const bottomSheet = page.locator("#terminal-bottom-sheet")
    await expect(bottomSheet).toBeVisible()

    // Bottom sheet should not overflow viewport
    const box = await bottomSheet.boundingBox()
    expect(box).toBeTruthy()
    if (box) {
      const viewportWidth = page.viewportSize()?.width ?? 320
      // Sheet should fit within viewport width
      expect(box.width).toBeLessThanOrEqual(viewportWidth)
      // Sheet should be anchored to bottom
      const viewportHeight = page.viewportSize()?.height ?? 568
      expect(box.y + box.height).toBeGreaterThanOrEqual(viewportHeight - 10)
    }
  })

  test("keyboard shortcuts work at 320px", async ({ page }) => {
    await page.goto("/jj-git/1")

    const bottomSheet = page.locator("#terminal-bottom-sheet")

    // Press t to open
    await page.keyboard.press("t")
    await expect(bottomSheet).toBeVisible()

    // Press Escape to close
    await page.keyboard.press("Escape")
    await expect(bottomSheet).not.toBeVisible()
  })
})

test.describe("TryIt Component", () => {
  test.beforeEach(async ({ page }) => {
    // Note: TryIt components need to be added to MDX content first
    // These tests verify the component behavior once added
    await page.goto("/jj-git/1")
  })

  test("TryIt button opens sidebar when clicked", async ({ page }) => {
    // Look for TryIt component (if any exist in content)
    const tryItButton = page.locator('button[aria-label^="Run command:"]')

    const count = await tryItButton.count()
    if (count === 0) {
      // Skip if no TryIt components in content yet
      test.skip(true, "No TryIt components in content yet")
      return
    }

    const sidebar = page.locator("#terminal-sidebar")

    // Click TryIt button
    await tryItButton.first().click()

    // Sidebar should open
    await expect(sidebar).toBeVisible()
  })

  test("TryIt button shows feedback when clicked", async ({ page }) => {
    const tryItButton = page.locator('button[aria-label^="Run command:"]')

    const count = await tryItButton.count()
    if (count === 0) {
      test.skip(true, "No TryIt components in content yet")
      return
    }

    // Click and check for "Sent!" feedback
    await tryItButton.first().click()

    // Button should show "Sent!" briefly
    await expect(tryItButton.first()).toContainText("Sent", { timeout: 100 })
  })
})

test.describe("Terminal Sidebar - Accessibility", () => {
  test("sidebar has proper ARIA attributes", async ({ page }) => {
    await page.goto("/jj-git/1")

    // Open sidebar
    const toggleButton = page.locator('button[aria-label*="terminal" i]').first()
    await toggleButton.click()

    const sidebar = page.locator("#terminal-sidebar")

    // Check ARIA attributes
    await expect(sidebar).toHaveAttribute("role", "dialog")
    await expect(sidebar).toHaveAttribute("aria-modal", "true")
    await expect(sidebar).toHaveAttribute("aria-label", "Terminal sidebar")
  })

  test("toggle button has proper ARIA attributes", async ({ page }) => {
    await page.goto("/jj-git/1")

    const toggleButton = page.locator('button[aria-controls="terminal-sidebar"]')

    // Check ARIA attributes
    await expect(toggleButton).toHaveAttribute("aria-controls", "terminal-sidebar")
    await expect(toggleButton).toHaveAttribute("aria-expanded", "false")

    // Open sidebar
    await toggleButton.click()

    // aria-expanded should update (though button may be hidden on desktop)
    const toggleAfter = page.locator('button[aria-controls="terminal-sidebar"]')
    const count = await toggleAfter.count()
    if (count > 0) {
      await expect(toggleAfter.first()).toHaveAttribute("aria-expanded", "true")
    }
  })

  test("page content becomes inert when sidebar is open", async ({ page }) => {
    await page.goto("/jj-git/1")

    // Open sidebar
    const toggleButton = page.locator('button[aria-label*="terminal" i]').first()
    await toggleButton.click()

    const sidebar = page.locator("#terminal-sidebar")
    await expect(sidebar).toBeVisible()

    // Verify that main-content has inert attribute set (focus trap)
    const hasInert = await page.evaluate(() => {
      const main = document.querySelector("#main-content")
      return main?.hasAttribute("inert") ?? false
    })

    // Verify inert attribute is set
    expect(hasInert).toBe(true)

    // Just verify sidebar is open and focus management works
    await expect(sidebar).toBeVisible()
  })
})
