/**
 * ContentService - Effect-TS service for loading and parsing MDX content.
 *
 * Provides type-safe content loading with proper error handling for:
 * - Tutorial steps (e.g., 01-installation.mdx)
 * - Index/landing pages
 * - Cheat sheets
 *
 * @example
 * ```ts
 * import { ContentService } from "./services/content"
 *
 * const program = Effect.gen(function* () {
 *   const content = yield* ContentService
 *   const step = yield* content.loadStep("jj-git", 3)
 *   return step
 * })
 * ```
 */

import fs from "node:fs/promises"
import path from "node:path"
import { Context, Data, Effect, Layer } from "effect"
import matter from "gray-matter"
import type {
  CheatsheetFrontmatter,
  IndexFrontmatter,
  StepFrontmatter,
} from "../lib/content/schemas"

/**
 * Error types for content loading operations.
 */
export class ContentError extends Data.TaggedClass("ContentError")<{
  readonly cause: "NotFound" | "ParseError" | "ValidationError"
  readonly message: string
  readonly path?: string
}> {}

/**
 * Raw MDX content with frontmatter.
 */
interface RawMdxContent {
  readonly frontmatter: unknown
  readonly content: string
}

/**
 * Step content with validated frontmatter and MDX body.
 */
export interface StepContent {
  readonly frontmatter: StepFrontmatter
  readonly content: string
  readonly slug: string
}

/**
 * Index/landing page content.
 */
export interface IndexContent {
  readonly frontmatter: IndexFrontmatter
  readonly content: string
}

/**
 * Cheat sheet content.
 */
export interface CheatsheetContent {
  readonly frontmatter: CheatsheetFrontmatter
  readonly content: string
}

/**
 * Metadata for a step (lighter than full content).
 */
export interface StepMeta {
  readonly step: number
  readonly title: string
  readonly description: string | undefined
  readonly slug: string
}

/**
 * ContentService interface.
 *
 * Provides methods for loading MDX content with proper error handling.
 */
export interface ContentServiceShape {
  /**
   * Load a specific step by tool pair and step number.
   *
   * @param toolPair - The tool pairing slug (e.g., "jj-git").
   * @param step - The step number (1-indexed).
   * @returns The step content with validated frontmatter.
   */
  readonly loadStep: (toolPair: string, step: number) => Effect.Effect<StepContent, ContentError>

  /**
   * Load the index/landing page for a tool pairing.
   *
   * @param toolPair - The tool pairing slug (e.g., "jj-git").
   * @returns The index content with validated frontmatter.
   */
  readonly loadIndex: (toolPair: string) => Effect.Effect<IndexContent, ContentError>

  /**
   * Load the cheat sheet for a tool pairing.
   *
   * @param toolPair - The tool pairing slug (e.g., "jj-git").
   * @returns The cheat sheet content with validated frontmatter.
   */
  readonly loadCheatsheet: (toolPair: string) => Effect.Effect<CheatsheetContent, ContentError>

  /**
   * List all available steps for a tool pairing.
   *
   * Returns metadata only (no content) for performance.
   *
   * @param toolPair - The tool pairing slug (e.g., "jj-git").
   * @returns Array of step metadata.
   */
  readonly listSteps: (toolPair: string) => Effect.Effect<readonly StepMeta[], ContentError>
}

/**
 * ContentService tag for dependency injection.
 */
export class ContentService extends Context.Tag("ContentService")<
  ContentService,
  ContentServiceShape
>() {}

/**
 * Validate frontmatter against the step schema.
 */
function validateStepFrontmatter(
  data: unknown,
  filePath: string,
): Effect.Effect<StepFrontmatter, ContentError> {
  const { stepFrontmatterSchema } = require("../lib/content/schemas")

  const result = stepFrontmatterSchema.safeParse(data)

  if (!result.success) {
    return Effect.fail(
      new ContentError({
        cause: "ValidationError",
        message: `Invalid frontmatter in ${filePath}: ${result.error.errors.map((e: { message: string }) => e.message).join(", ")}`,
        path: filePath,
      }),
    )
  }

  return Effect.succeed(result.data)
}

/**
 * Validate frontmatter against the index schema.
 */
function validateIndexFrontmatter(
  data: unknown,
  filePath: string,
): Effect.Effect<IndexFrontmatter, ContentError> {
  const { indexFrontmatterSchema } = require("../lib/content/schemas")

  const result = indexFrontmatterSchema.safeParse(data)

  if (!result.success) {
    return Effect.fail(
      new ContentError({
        cause: "ValidationError",
        message: `Invalid frontmatter in ${filePath}: ${result.error.errors.map((e: { message: string }) => e.message).join(", ")}`,
        path: filePath,
      }),
    )
  }

  return Effect.succeed(result.data)
}

/**
 * Validate frontmatter against the cheat sheet schema.
 */
function validateCheatsheetFrontmatter(
  data: unknown,
  filePath: string,
): Effect.Effect<CheatsheetFrontmatter, ContentError> {
  const { cheatsheetFrontmatterSchema } = require("../lib/content/schemas")

  const result = cheatsheetFrontmatterSchema.safeParse(data)

  if (!result.success) {
    return Effect.fail(
      new ContentError({
        cause: "ValidationError",
        message: `Invalid frontmatter in ${filePath}: ${result.error.errors.map((e: { message: string }) => e.message).join(", ")}`,
        path: filePath,
      }),
    )
  }

  return Effect.succeed(result.data)
}

/**
 * Read and parse an MDX file with gray-matter.
 */
function readMdxFile(filePath: string): Effect.Effect<RawMdxContent, ContentError> {
  return Effect.tryPromise({
    try: async () => {
      const fileContent = await fs.readFile(filePath, "utf-8")
      const parsed = matter(fileContent)
      return {
        frontmatter: parsed.data,
        content: parsed.content,
      } as const
    },
    catch: (error) =>
      new ContentError({
        cause: "ParseError",
        message: `Failed to parse MDX file: ${error instanceof Error ? error.message : String(error)}`,
        path: filePath,
      }),
  })
}

/**
 * Check if a file exists, returning a ContentError if not.
 */
function requireFileExists(
  filePath: string,
  description: string,
): Effect.Effect<void, ContentError> {
  return Effect.tryPromise({
    try: () => fs.access(filePath),
    catch: () =>
      new ContentError({
        cause: "NotFound",
        message: `${description} not found`,
        path: filePath,
      }),
  })
}

/**
 * Resolve the content directory path for a tool pairing.
 */
function getContentPath(toolPair: string): string {
  // In development: packages/web/content/comparisons/{toolPair}/
  // In production: .next/ or similar
  const isDev = process.env.NODE_ENV === "development"

  if (isDev) {
    return path.join(process.cwd(), "content", "comparisons", toolPair)
  }

  // Production path (Next.js build output)
  return path.join(process.cwd(), "content", "comparisons", toolPair)
}

/**
 * Get the filename for a step number.
 */
function getStepFilename(step: number): string {
  return `${step.toString().padStart(2, "0")}-step.mdx`
}

/**
 * Create the ContentService implementation.
 */
const make = Effect.succeed<ContentServiceShape>({
  loadStep: (toolPair: string, step: number) =>
    Effect.gen(function* () {
      const basePath = getContentPath(toolPair)
      const filename = getStepFilename(step)
      const filePath = path.join(basePath, filename)

      yield* requireFileExists(filePath, `Step ${step} for ${toolPair}`)

      const raw = yield* readMdxFile(filePath)
      const frontmatter = yield* validateStepFrontmatter(raw.frontmatter, filePath)

      return {
        frontmatter,
        content: raw.content,
        slug: filename.replace(".mdx", ""),
      } as const
    }),

  loadIndex: (toolPair: string) =>
    Effect.gen(function* () {
      const basePath = getContentPath(toolPair)
      const filePath = path.join(basePath, "index.mdx")

      yield* requireFileExists(filePath, `Index page for ${toolPair}`)

      const raw = yield* readMdxFile(filePath)
      const frontmatter = yield* validateIndexFrontmatter(raw.frontmatter, filePath)

      return {
        frontmatter,
        content: raw.content,
      } as const
    }),

  loadCheatsheet: (toolPair: string) =>
    Effect.gen(function* () {
      const basePath = getContentPath(toolPair)
      const filePath = path.join(basePath, "cheatsheet.mdx")

      yield* requireFileExists(filePath, `Cheat sheet for ${toolPair}`)

      const raw = yield* readMdxFile(filePath)
      const frontmatter = yield* validateCheatsheetFrontmatter(raw.frontmatter, filePath)

      return {
        frontmatter,
        content: raw.content,
      } as const
    }),

  listSteps: (toolPair: string) =>
    Effect.gen(function* () {
      const basePath = getContentPath(toolPair)

      const entries = yield* Effect.tryPromise({
        try: () => fs.readdir(basePath),
        catch: (error) =>
          new ContentError({
            cause: "NotFound",
            message: `Failed to read content directory: ${error instanceof Error ? error.message : String(error)}`,
            path: basePath,
          }),
      })

      // Filter for step files (XX-step.mdx)
      const stepFiles = entries.filter((entry) => /^\d{2}-step\.mdx$/.test(entry))

      // Read metadata from each step file
      const steps = yield* Effect.all(
        stepFiles.map((filename) =>
          Effect.gen(function* () {
            const filePath = path.join(basePath, filename)
            const raw = yield* readMdxFile(filePath)
            const frontmatter = yield* validateStepFrontmatter(raw.frontmatter, filePath)

            return {
              step: frontmatter.step,
              title: frontmatter.title,
              description: frontmatter.description,
              slug: filename.replace(".mdx", ""),
            }
          }),
        ),
        { concurrency: "unbounded" },
      )

      // Sort by step number
      const sorted = Array.from(steps).sort((a, b) => a.step - b.step)
      return sorted
    }),
})

/**
 * Live layer for ContentService.
 *
 * Provides the real implementation for production use.
 */
export const ContentServiceLive = Layer.effect(ContentService, make)
