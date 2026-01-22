/**
 * Content service - Re-exports from tutor-content-core with helper functions.
 *
 * This module provides convenient helper functions for loading content
 * that handle Effect execution and layer provision.
 *
 * @example
 * ```ts
 * import { loadStep, loadIndex, listSteps } from "@/services/content"
 *
 * // In a Next.js page component
 * const step = await loadStep("jj-git", 1)
 * const index = await loadIndex("jj-git")
 * const steps = await listSteps("jj-git")
 * ```
 */

import type { Content, ContentError } from "@hmemcpy/tutor-content-core"
import { ContentService } from "@hmemcpy/tutor-content-core"
import { Effect } from "effect"
import { ContentLayer } from "../lib/content/layer"
import type {
  CheatsheetFrontmatter,
  IndexFrontmatter,
  StepFrontmatter,
} from "../lib/content/schemas"
import { CheatsheetType, IndexType, StepType } from "../lib/content/types"

// Re-export types for convenience
export type { StepMeta } from "../lib/content/types"
export type { Content, ContentError }

/**
 * Step content with validated frontmatter.
 */
export type StepContent = Content<StepFrontmatter>

/**
 * Index content with validated frontmatter.
 */
export type IndexContent = Content<IndexFrontmatter>

/**
 * Cheatsheet content with validated frontmatter.
 */
export type CheatsheetContent = Content<CheatsheetFrontmatter>

/**
 * Load a step by tool pair and step number.
 *
 * @param toolPair - The tool pairing slug (e.g., "jj-git")
 * @param step - The step number (1-indexed)
 * @returns Promise resolving to step content, or null if not found
 *
 * @example
 * ```ts
 * const step = await loadStep("jj-git", 1)
 * if (step) {
 *   console.log(step.frontmatter.title)
 * }
 * ```
 */
export async function loadStep(toolPair: string, step: number): Promise<StepContent | null> {
  const program = Effect.gen(function* () {
    const service = yield* ContentService
    return yield* service.load(StepType, `${toolPair}/${step}`)
  })

  const result = await program.pipe(Effect.provide(ContentLayer), Effect.either, Effect.runPromise)

  if (result._tag === "Left") {
    // Return null for NotFound, throw for other errors
    if (result.left.cause === "NotFound") {
      return null
    }
    throw new Error(result.left.message)
  }

  return result.right
}

/**
 * Load the index page for a tool pairing.
 *
 * @param toolPair - The tool pairing slug (e.g., "jj-git")
 * @returns Promise resolving to index content, or null if not found
 */
export async function loadIndex(toolPair: string): Promise<IndexContent | null> {
  const program = Effect.gen(function* () {
    const service = yield* ContentService
    return yield* service.load(IndexType, toolPair)
  })

  const result = await program.pipe(Effect.provide(ContentLayer), Effect.either, Effect.runPromise)

  if (result._tag === "Left") {
    if (result.left.cause === "NotFound") {
      return null
    }
    throw new Error(result.left.message)
  }

  return result.right
}

/**
 * Load the cheatsheet for a tool pairing.
 *
 * @param toolPair - The tool pairing slug (e.g., "jj-git")
 * @returns Promise resolving to cheatsheet content, or null if not found
 */
export async function loadCheatsheet(toolPair: string): Promise<CheatsheetContent | null> {
  const program = Effect.gen(function* () {
    const service = yield* ContentService
    return yield* service.load(CheatsheetType, toolPair)
  })

  const result = await program.pipe(Effect.provide(ContentLayer), Effect.either, Effect.runPromise)

  if (result._tag === "Left") {
    if (result.left.cause === "NotFound") {
      return null
    }
    throw new Error(result.left.message)
  }

  return result.right
}

/**
 * List all steps for a tool pairing.
 *
 * Returns full content for each step, sorted by step number.
 *
 * @param toolPair - The tool pairing slug (e.g., "jj-git")
 * @returns Promise resolving to array of step content
 */
export async function listSteps(toolPair: string): Promise<readonly StepContent[]> {
  const program = Effect.gen(function* () {
    const service = yield* ContentService
    const allSteps = yield* service.list(StepType, {
      // Filter to only include steps for this tool pair
      filter: (content) => content.filePath.includes(`/${toolPair}/`),
    })
    // Sort by step number
    return [...allSteps].sort((a, b) => a.frontmatter.step - b.frontmatter.step)
  })

  return program.pipe(Effect.provide(ContentLayer), Effect.runPromise)
}
