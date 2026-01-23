/**
 * Server-side progress reading from cookies.
 * Uses Next.js cookies() API to read progress during SSR.
 *
 * Note: cookies() throws during static generation (build time).
 * We catch this and return empty progress, allowing pages to be statically generated.
 * The client will hydrate with actual progress from localStorage/cookies.
 */

import { Effect, Option } from "effect"
import { cookies } from "next/headers"
import { type CookieProgress, type ProgressMap, parseProgressCookie } from "./progress-cookie"

/**
 * Try to read a cookie value. Returns undefined if cookies() is unavailable
 * (e.g., during static generation).
 */
async function tryGetCookieValue(name: string): Promise<string | undefined> {
  try {
    const cookieStore = await cookies()
    return cookieStore.get(name)?.value
  } catch {
    // Static generation - no cookies available
    return undefined
  }
}

/**
 * Read progress from cookies on the server side.
 * Returns a ProgressMap with all tool pair progress.
 * Returns empty map during static generation when cookies() is unavailable.
 */
export const getServerProgress = (): Effect.Effect<ProgressMap, never> =>
  Effect.gen(function* () {
    const cookieValue = yield* Effect.promise(() => tryGetCookieValue("toolkata_progress"))
    return yield* parseProgressCookie(cookieValue)
  })

/**
 * Get progress for a specific tool pair on the server side.
 */
export const getServerProgressForPair = (
  toolPair: string,
): Effect.Effect<Option.Option<CookieProgress>, never> =>
  Effect.gen(function* () {
    const progress = yield* getServerProgress()
    return Option.fromNullable(progress[toolPair])
  })

/**
 * Async wrapper for use in React Server Components.
 * Returns empty progress during static generation.
 */
export async function getServerProgressAsync(): Promise<ProgressMap> {
  return Effect.runPromise(getServerProgress())
}

/**
 * Async wrapper for getting a single tool pair's progress.
 * Returns undefined during static generation.
 */
export async function getServerProgressForPairAsync(
  toolPair: string,
): Promise<CookieProgress | undefined> {
  const result = await Effect.runPromise(getServerProgressForPair(toolPair))
  return Option.getOrUndefined(result)
}
