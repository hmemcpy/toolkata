/**
 * Cookie-based progress storage for SSR-compatible progress tracking.
 *
 * Cookie format: toolkata_progress=slug1:completed:current,slug2:completed:current
 * Example: jj-git:1.2.3:4,vim-nano:1:2
 *
 * This allows the server to read progress during SSR, eliminating hydration flicker.
 */

import { Data, Effect, Option } from "effect"

const COOKIE_NAME = "toolkata_progress"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

/**
 * Progress data for a single tool pair
 */
export interface CookieProgress {
  readonly completedSteps: readonly number[]
  readonly currentStep: number
}

/**
 * Map of tool pair slugs to their progress
 */
export type ProgressMap = Readonly<Record<string, CookieProgress>>

/**
 * Error types for cookie operations
 */
export class CookieError extends Data.TaggedClass("CookieError")<{
  readonly cause: "Unavailable" | "ParseError"
  readonly message: string
}> {}

/**
 * Parse a progress cookie value into a ProgressMap
 */
export const parseProgressCookie = (
  cookieValue: string | undefined,
): Effect.Effect<ProgressMap, never> =>
  Effect.sync(() => {
    if (!cookieValue) return {}

    const result: Record<string, CookieProgress> = {}

    for (const part of cookieValue.split(",")) {
      const segments = part.split(":")
      const slug = segments[0]
      const completedStr = segments[1]
      const currentStr = segments[2]

      if (!slug || !completedStr || !currentStr) continue

      const completedSteps =
        completedStr === "0"
          ? []
          : completedStr
              .split(".")
              .map((s) => Number.parseInt(s, 10))
              .filter((n) => !Number.isNaN(n))

      const currentStep = Number.parseInt(currentStr, 10)
      if (Number.isNaN(currentStep)) continue

      result[slug] = { completedSteps, currentStep }
    }

    return result
  })

/**
 * Serialize a ProgressMap to cookie value string
 */
export const serializeProgressCookie = (progress: ProgressMap): string =>
  Object.entries(progress)
    .map(([slug, data]) => {
      const completed = data.completedSteps.length > 0 ? data.completedSteps.join(".") : "0"
      return `${slug}:${completed}:${data.currentStep}`
    })
    .join(",")

/**
 * Read progress from document.cookie (client-side only)
 */
export const readProgressFromCookie = (): Effect.Effect<ProgressMap, CookieError> =>
  Effect.gen(function* () {
    if (typeof document === "undefined") {
      return yield* Effect.fail(
        new CookieError({ cause: "Unavailable", message: "document is not available (SSR)" }),
      )
    }

    const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`))
    const value = match?.[1] ? decodeURIComponent(match[1]) : undefined
    return yield* parseProgressCookie(value)
  })

/**
 * Read progress from document.cookie, returning empty map on error
 */
export const readProgressFromCookieOrEmpty = (): Effect.Effect<ProgressMap, never> =>
  readProgressFromCookie().pipe(Effect.orElseSucceed(() => ({})))

/**
 * Write progress to document.cookie (client-side only)
 */
export const writeProgressToCookie = (progress: ProgressMap): Effect.Effect<void, CookieError> =>
  Effect.gen(function* () {
    if (typeof document === "undefined") {
      return yield* Effect.fail(
        new CookieError({ cause: "Unavailable", message: "document is not available (SSR)" }),
      )
    }

    const value = encodeURIComponent(serializeProgressCookie(progress))
    document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
  })

/**
 * Update progress for a single tool pair in the cookie
 */
export const updateProgressInCookie = (
  toolPair: string,
  completedSteps: readonly number[],
  currentStep: number,
): Effect.Effect<void, CookieError> =>
  Effect.gen(function* () {
    const progress = yield* readProgressFromCookieOrEmpty()
    const updated: ProgressMap = {
      ...progress,
      [toolPair]: { completedSteps, currentStep },
    }
    yield* writeProgressToCookie(updated)
  })

/**
 * Get progress for a specific tool pair from cookies
 */
export const getProgressFromCookie = (
  toolPair: string,
): Effect.Effect<Option.Option<CookieProgress>, CookieError> =>
  Effect.gen(function* () {
    const progress = yield* readProgressFromCookie()
    return Option.fromNullable(progress[toolPair])
  })

/**
 * Sync version for use in React hooks (runs the effect synchronously)
 */
export const updateProgressInCookieSync = (
  toolPair: string,
  completedSteps: readonly number[],
  currentStep: number,
): void => {
  Effect.runSync(
    updateProgressInCookie(toolPair, completedSteps, currentStep).pipe(
      Effect.catchAll(() => Effect.void),
    ),
  )
}
