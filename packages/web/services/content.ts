/**
 * Content service - Helper functions for loading MDX content.
 *
 * Provides convenient helper functions for loading content
 * that handle Effect execution and layer provision.
 *
 * @example
 * ```ts
 * import { loadStep, loadIndex, loadKata, listSteps } from "@/services/content"
 *
 * // In a Next.js page component
 * const step = await loadStep("jj-git", 1)
 * const index = await loadIndex("jj-git")
 * const steps = await listSteps("jj-git")
 * const kata = await loadKata("jj-git", 1)
 * ```
 */

import type { Content, ContentError } from "../lib/content-core"
import { ContentService } from "../lib/content-core"
import { Effect } from "effect"
import { ContentLayer } from "../lib/content/layer"
import type { IndexFrontmatter, KataFrontmatter, StepFrontmatter } from "../lib/content/schemas"
import { IndexType, KataType, StepType } from "../lib/content/types"

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
 * Kata content with validated frontmatter.
 */
export type KataContent = Content<KataFrontmatter>

/**
 * Load a step by tool pair and step number.
 *
 * @param toolPair - The tool pairing slug (e.g., "jj-git")
 * @param step - The step number (1-indexed)
 * @returns Promise resolving to step content, or null if not found
 */
export async function loadStep(toolPair: string, step: number): Promise<StepContent | null> {
  const program = Effect.gen(function* () {
    const service = yield* ContentService
    return yield* service.load(StepType, `${toolPair}/${step}`)
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
 * List all steps for a tool pairing.
 *
 * Returns full content for each step, sorted by step number.
 * Uses incremental loading from step 1 until NotFound is returned.
 *
 * @param toolPair - The tool pairing slug (e.g., "jj-git")
 * @returns Promise resolving to array of step content
 */
export async function listSteps(toolPair: string): Promise<readonly StepContent[]> {
  const program = Effect.gen(function* () {
    const service = yield* ContentService
    const steps: StepContent[] = []

    for (let stepNum = 1; stepNum <= 100; stepNum++) {
      const result = yield* Effect.either(service.load(StepType, `${toolPair}/${stepNum}`))

      if (result._tag === "Left") {
        if (result.left.cause === "NotFound") {
          break
        }
        continue
      }

      steps.push(result.right)
    }

    return steps
  })

  return program.pipe(Effect.provide(ContentLayer), Effect.runPromise)
}

/**
 * Load a Kata by tool pair and Kata number.
 *
 * @param toolPair - The tool pairing slug (e.g., "jj-git")
 * @param kataId - The Kata number (1-7)
 * @returns Promise resolving to Kata content, or null if not found
 */
export async function loadKata(toolPair: string, kataId: number): Promise<KataContent | null> {
  const program = Effect.gen(function* () {
    const service = yield* ContentService
    return yield* service.load(KataType, `${toolPair}/${kataId}`)
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

