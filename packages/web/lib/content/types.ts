/**
 * Content type definitions.
 *
 * Defines Step and Index content types with:
 * - Zod schemas for frontmatter validation
 * - Custom path resolvers for the content structure
 */

import { defineContentType } from "../content-core"
import { indexFrontmatterSchema, stepFrontmatterSchema } from "./schemas"

/**
 * Content root directory (relative to packages/web).
 */
export const CONTENT_ROOT = "./content/comparisons"

/**
 * Step content type.
 *
 * Path pattern: {toolPair}/{step} → content/comparisons/{toolPair}/{step.padStart(2, "0")}-step.mdx
 *
 * @example
 * ```ts
 * const step = yield* service.load(StepType, "jj-git/1")
 * // Loads: content/comparisons/jj-git/01-step.mdx
 * ```
 */
export const StepType = defineContentType({
  name: "step",
  schema: stepFrontmatterSchema,
  pathResolver: (slug) => {
    const parts = slug.split("/")
    const toolPair = parts[0]
    const stepNum = parts[1]
    if (toolPair === undefined || stepNum === undefined) {
      throw new Error(`Invalid step slug: ${slug}. Expected format: toolPair/stepNumber`)
    }
    const paddedStep = stepNum.padStart(2, "0")
    return `${CONTENT_ROOT}/${toolPair}/${paddedStep}-step.mdx`
  },
  filePattern: "**/[0-9][0-9]-step.mdx",
})

/**
 * Index content type.
 *
 * Path pattern: {toolPair} → content/comparisons/{toolPair}/index.mdx
 *
 * @example
 * ```ts
 * const index = yield* service.load(IndexType, "jj-git")
 * // Loads: content/comparisons/jj-git/index.mdx
 * ```
 */
export const IndexType = defineContentType({
  name: "index",
  schema: indexFrontmatterSchema,
  pathResolver: (slug) => `${CONTENT_ROOT}/${slug}/index.mdx`,
  filePattern: "**/index.mdx",
})

/**
 * Metadata for a step (lighter than full content).
 *
 * Used in step lists where we don't need the full MDX content.
 */
export interface StepMeta {
  readonly step: number
  readonly title: string
  readonly description: string | undefined
  readonly slug: string
}
