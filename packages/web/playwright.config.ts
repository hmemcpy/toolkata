import { defineConfig, devices } from "@playwright/test"

/**
 * Playwright configuration for toolkata browser tests.
 *
 * Tests cover:
 * - Progress persistence (localStorage)
 * - Fallback mode when sandbox unavailable
 * - Responsive design (320px, 200% zoom)
 * - Keyboard navigation
 *
 * @see https://playwright.dev/docs/test-configuration
 */
// biome-ignore lint/complexity/useLiteralKeys: process.env requires bracket notation for TypeScript
const isCI = !!process.env["CI"]

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  ...(isCI ? { workers: 1 } : {}),
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 14"] },
    },
  ],

  /* Run local dev server before starting tests */
  webServer: {
    command: "bun run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !isCI,
    timeout: 120 * 1000,
  },
})
