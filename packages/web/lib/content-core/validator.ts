/**
 * validator.ts - Frontmatter validation utilities using Zod.
 */

import { Effect } from "effect"
import type { z } from "zod"
import { ContentError } from "./errors"

/**
 * Validates frontmatter data against a Zod schema.
 */
export function validateFrontmatter<T extends z.ZodType>(
  schema: T,
  data: unknown,
  path: string,
  contentType: string,
): Effect.Effect<z.infer<T>, ContentError> {
  return Effect.gen(function* () {
    const result = schema.safeParse(data)

    if (!result.success) {
      const details = result.error.issues.map(
        (issue) => `${issue.path.length > 0 ? issue.path.join(".") : "(root)"}: ${issue.message}`,
      )

      return yield* Effect.fail(
        ContentError.validationError(path, contentType, {
          errors: details,
          issues: result.error.issues,
        }),
      )
    }

    return result.data
  })
}
