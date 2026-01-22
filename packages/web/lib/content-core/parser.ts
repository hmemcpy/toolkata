/**
 * parser.ts - Frontmatter parsing utilities using gray-matter.
 */

import { Effect } from "effect"
import matter from "gray-matter"
import { ContentError } from "./errors"

/**
 * Result of parsing frontmatter from a raw string.
 */
export interface ParsedFrontmatter {
  readonly data: unknown
  readonly content: string
}

/**
 * Parse frontmatter from a raw MDX string.
 */
export function parseFrontmatter(raw: string): Effect.Effect<ParsedFrontmatter, ContentError> {
  return Effect.gen(function* () {
    if (raw.length === 0) {
      return yield* Effect.fail(ContentError.parseError("<unknown>", "Empty file"))
    }

    const result = yield* Effect.try({
      try: () => matter(raw),
      catch: (error) =>
        ContentError.parseError("<unknown>", {
          message: error instanceof Error ? error.message : String(error),
        }),
    })

    const hasDelimiters = raw.trimStart().startsWith("---")

    if (!hasDelimiters) {
      return yield* Effect.fail(
        ContentError.parseError("<unknown>", "Missing frontmatter delimiters"),
      )
    }

    return {
      data: result.data,
      content: result.content,
    } as const
  })
}
