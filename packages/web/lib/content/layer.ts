/**
 * Content service layer configuration.
 *
 * Provides the Effect layer for ContentService from tutor-content-core.
 * Used by page components to load MDX content.
 */

import {
  CacheServiceLive,
  ContentConfigLive,
  ContentServiceLive,
} from "@hmemcpy/tutor-content-core"
import { Layer } from "effect"

/**
 * Content layer for production use.
 *
 * Configuration:
 * - Content root: Current working directory (Next.js project root)
 * - Caching: Disabled (static generation handles caching)
 *
 * @example
 * ```ts
 * import { ContentService } from "@hmemcpy/tutor-content-core"
 * import { ContentLayer } from "@/lib/content/layer"
 * import { StepType } from "@/lib/content/types"
 * import { Effect } from "effect"
 *
 * const program = Effect.gen(function* () {
 *   const service = yield* ContentService
 *   return yield* service.load(StepType, "jj-git/1")
 * })
 *
 * const result = await Effect.runPromise(Effect.provide(program, ContentLayer))
 * ```
 */
export const ContentLayer = ContentServiceLive.pipe(
  Layer.provide(
    Layer.mergeAll(
      ContentConfigLive({
        contentRoot: process.cwd(),
        cacheEnabled: false,
      }),
      CacheServiceLive,
    ),
  ),
)
