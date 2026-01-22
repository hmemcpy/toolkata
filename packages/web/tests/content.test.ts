/**
 * Content loading unit tests.
 *
 * Tests the content service functions that load MDX content with validated frontmatter.
 * Uses Bun test runner for fast unit testing (not Playwright, which is for E2E).
 */

/// <reference types="bun-types" />

import { describe, expect, it } from "bun:test"
import { loadCheatsheet, loadIndex, loadStep, listSteps } from "../services/content"

describe("content service", () => {
  describe("loadStep", () => {
    it("returns valid content for existing step", async () => {
      const step = await loadStep("jj-git", 1)

      expect(step).not.toBeNull()
      expect(step?.frontmatter.title).toBe("Installation & Setup")
      expect(step?.frontmatter.step).toBe(1)
      expect(step?.frontmatter.description).toBe(
        "Installing jj and setting up a colocated repository"
      )
      expect(step?.frontmatter.gitCommands).toEqual(["git init", "git clone"])
      expect(step?.frontmatter.jjCommands).toEqual(["jj git init", "jj git clone"])
    })

    it("returns null for non-existent tool pair", async () => {
      const step = await loadStep("non-existent-tool-pair", 1)

      expect(step).toBeNull()
    })

    it("returns null for non-existent step number", async () => {
      const step = await loadStep("jj-git", 999)

      expect(step).toBeNull()
    })

    it("returns null for invalid step number", async () => {
      const step = await loadStep("jj-git", -1)

      expect(step).toBeNull()
    })

    it("returns content with MDX source", async () => {
      const step = await loadStep("jj-git", 1)

      expect(step?.content).toBeDefined()
      expect(step?.content).toContain("Installation & Setup")
      expect(step?.content).toContain("brew install jj")
    })
  })

  describe("loadIndex", () => {
    it("returns valid content for existing index", async () => {
      const index = await loadIndex("jj-git")

      expect(index).not.toBeNull()
      expect(index?.frontmatter.title).toBe("Why jj over git?")
      expect(index?.frontmatter.description).toContain(
        "Learn why jj (Jujutsu) is a safer"
      )
      expect(index?.frontmatter.estimatedTime).toBe("~40 min")
    })

    it("returns null for non-existent tool pair", async () => {
      const index = await loadIndex("non-existent-tool-pair")

      expect(index).toBeNull()
    })

    it("returns content with MDX source", async () => {
      const index = await loadIndex("jj-git")

      expect(index?.content).toBeDefined()
      expect(index?.content).toContain("Why jj over git?")
      expect(index?.content).toContain("Jujutsu")
    })
  })

  describe("loadCheatsheet", () => {
    it("returns valid content for existing cheatsheet", async () => {
      const cheatsheet = await loadCheatsheet("jj-git")

      expect(cheatsheet).not.toBeNull()
      expect(cheatsheet?.frontmatter.title).toBe("jj vs Git Command Cheat Sheet")
      expect(cheatsheet?.frontmatter.description).toBe(
        "Quick reference for git users learning jj (Jujutsu)"
      )
    })

    it("returns null for non-existent tool pair", async () => {
      const cheatsheet = await loadCheatsheet("non-existent-tool-pair")

      expect(cheatsheet).toBeNull()
    })

    it("returns content with MDX source", async () => {
      const cheatsheet = await loadCheatsheet("jj-git")

      expect(cheatsheet?.content).toBeDefined()
      expect(cheatsheet?.content).toContain("jj vs Git Command Cheat Sheet")
      expect(cheatsheet?.content).toContain("git status")
    })
  })

  describe("listSteps", () => {
    it("returns all steps for a tool pair", async () => {
      const steps = await listSteps("jj-git")

      expect(steps.length).toBe(12)
    })

    it("returns steps sorted by step number", async () => {
      const steps = await listSteps("jj-git")

      const stepNumbers = steps.map((s) => s.frontmatter.step)
      const sortedNumbers = [...stepNumbers].sort((a, b) => a - b)

      expect(stepNumbers).toEqual(sortedNumbers)
    })

    it("returns empty array for non-existent tool pair", async () => {
      const steps = await listSteps("non-existent-tool-pair")

      expect(steps).toEqual([])
    })

    it("returns steps with all required frontmatter fields", async () => {
      const steps = await listSteps("jj-git")

      for (const step of steps) {
        expect(step.frontmatter.title).toBeDefined()
        expect(typeof step.frontmatter.title).toBe("string")
        expect(step.frontmatter.step).toBeDefined()
        expect(typeof step.frontmatter.step).toBe("number")
        expect(step.frontmatter.step).toBeGreaterThan(0)
      }
    })
  })

  describe("frontmatter validation", () => {
    it("includes all step frontmatter fields in first step", async () => {
      const step = await loadStep("jj-git", 1)

      expect(step?.frontmatter).toMatchObject({
        title: "Installation & Setup",
        step: 1,
        description: "Installing jj and setting up a colocated repository",
        gitCommands: ["git init", "git clone"],
        jjCommands: ["jj git init", "jj git clone"],
      })
    })

    it("handles step with empty command arrays", async () => {
      // Step 12 has empty gitCommands and jjCommands arrays
      const step = await loadStep("jj-git", 12)

      expect(step).not.toBeNull()
      expect(step?.frontmatter.gitCommands).toEqual([])
      expect(step?.frontmatter.jjCommands).toEqual([])
    })

    it("handles step without optional description", async () => {
      // Find a step without description if one exists
      const steps = await listSteps("jj-git")
      const stepWithoutDescription = steps.find(
        (s) => s.frontmatter.description === undefined
      )

      // If such a step exists, verify it loads correctly
      if (stepWithoutDescription !== undefined) {
        const step = await loadStep("jj-git", stepWithoutDescription.frontmatter.step)
        expect(step).not.toBeNull()
        expect(step?.frontmatter.description).toBeUndefined()
      }
    })
  })
})
