/**
 * Server-side progress reading from cookies.
 * Uses Next.js cookies() API to read progress during SSR.
 */

import { Effect, Option } from "effect"
import { cookies } from "next/headers"
import { type CookieProgress, type ProgressMap, parseProgressCookie } from "./progress-cookie"

/**
 * Read progress from cookies on the server side.
 * Returns a ProgressMap with all tool pair progress.
 */
export const getServerProgress = (): Effect.Effect<ProgressMap, never> =>
  Effect.gen(function* () {
    const cookieStore = yield* Effect.promise(() => cookies())
    const cookieValue = cookieStore.get("toolkata_progress")?.value
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
 * Async wrapper for use in React Server Components
 */
export async function getServerProgressAsync(): Promise<ProgressMap> {
  return Effect.runPromise(getServerProgress())
}

/**
 * Async wrapper for getting a single tool pair's progress
 */
export async function getServerProgressForPairAsync(
  toolPair: string,
): Promise<CookieProgress | undefined> {
  const result = await Effect.runPromise(getServerProgressForPair(toolPair))
  return Option.getOrUndefined(result)
}
