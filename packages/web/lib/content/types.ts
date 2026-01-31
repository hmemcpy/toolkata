/**
 * Content type definitions.
 *
 * Defines Step and Index content types with:
 * - Zod schemas for frontmatter validation
 * - Custom path resolvers for the content structure
 */

import { defineContentType } from "../content-core"
import { indexFrontmatterSchema, kataFrontmatterSchema, stepFrontmatterSchema } from "./schemas"

/**
 * Sandbox configuration for terminal behavior.
 *
 * Resolved from three sources (in priority order):
 * 1. Step frontmatter
 * 2. Tool-pair config.yml
 * 3. Global defaults
 */
export interface SandboxConfig {
  readonly enabled: boolean
  readonly environment: "bash" | "node" | "python"
  readonly timeout: number
  readonly init: readonly string[]
}

/**
 * Global defaults for sandbox configuration.
 */
export const DEFAULT_SANDBOX_CONFIG: SandboxConfig = {
  enabled: true,
  environment: "bash",
  timeout: 60,
  init: [],
}

/**
 * Raw sandbox config from frontmatter (all fields optional).
 *
 * Matches the Zod-inferred type from sandboxConfigSchema.
 */
export type RawSandboxConfig = {
  readonly enabled?: boolean
  readonly environment?: "bash" | "node" | "python"
  readonly timeout?: number
  readonly init?: string[]
}

/**
 * Resolve sandbox configuration from three sources.
 *
 * Priority order (later overrides earlier):
 * 1. Global defaults
 * 2. Tool-pair config.yml
 * 3. Step frontmatter
 *
 * @param stepConfig - Sandbox config from step frontmatter (optional)
 * @param toolPairConfig - Sandbox config from tool-pair config.yml
 * @returns Resolved sandbox configuration
 *
 * @example
 * ```ts
 * const resolved = resolveSandboxConfig(
 *   { enabled: false, environment: "node" },  // from step frontmatter
 *   { enabled: true, environment: "bash", timeout: 60 }  // from config.yml
 * )
 * // Result: { enabled: false, environment: "node", timeout: 60, init: [] }
 * // Note: step's enabled=false and environment="node" override config.yml
 * ```
 */
export function resolveSandboxConfig(
  stepConfig: RawSandboxConfig | undefined,
  toolPairConfig:
    | {
        sandbox: {
          enabled?: boolean
          environment?: string
          timeout?: number
          init?: readonly string[]
        }
      }
    | undefined,
): SandboxConfig {
  return {
    enabled:
      stepConfig?.enabled ?? toolPairConfig?.sandbox?.enabled ?? DEFAULT_SANDBOX_CONFIG.enabled,
    environment:
      (stepConfig?.environment as "bash" | "node" | "python" | undefined) ??
      (toolPairConfig?.sandbox?.environment as "bash" | "node" | "python" | undefined) ??
      DEFAULT_SANDBOX_CONFIG.environment,
    timeout:
      stepConfig?.timeout ?? toolPairConfig?.sandbox?.timeout ?? DEFAULT_SANDBOX_CONFIG.timeout,
    init: stepConfig?.init ?? toolPairConfig?.sandbox?.init ?? DEFAULT_SANDBOX_CONFIG.init,
  } as const
}

/**
 * Content root directory (relative to packages/web).
 */
export const CONTENT_ROOT = "./content/comparisons"

/**
 * Kata content root directory (relative to packages/web).
 */
export const KATA_ROOT = "./content/katas"

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

/**
 * Metadata for a Kata (lighter than full content).
 *
 * Used in Kata lists where we don't need the full MDX content.
 */
export interface KataMeta {
  readonly kata: number
  readonly title: string
  readonly duration: string
  readonly focus: string
  readonly slug: string
  readonly exerciseCount: number
}

/**
 * Kata content type.
 *
 * Path pattern: {toolPair}/{kataId} → content/katas/{toolPair}/{kataId.padStart(2, "0")}-kata.mdx
 *
 * @example
 * ```ts
 * const kata = yield* service.load(KataType, "jj-git/1")
 * // Loads: content/katas/jj-git/01-kata.mdx
 * ```
 */
export const KataType = defineContentType({
  name: "kata",
  schema: kataFrontmatterSchema,
  pathResolver: (slug) => {
    const parts = slug.split("/")
    const toolPair = parts[0]
    const kataId = parts[1]
    if (toolPair === undefined || kataId === undefined) {
      throw new Error(`Invalid kata slug: ${slug}. Expected format: toolPair/kataId`)
    }
    const paddedKata = kataId.padStart(2, "0")
    return `${KATA_ROOT}/${toolPair}/${paddedKata}-kata.mdx`
  },
  filePattern: "**/[0-9][0-9]-kata.mdx",
})
