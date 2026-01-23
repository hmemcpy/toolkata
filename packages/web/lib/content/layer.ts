/**
 * Content service layer configuration.
 *
 * Provides the Effect layer for ContentService.
 * Used by page components to load MDX content.
 */

import { CacheServiceLive, ContentConfigLive, ContentServiceLive } from "../content-core"
import { Layer } from "effect"

/**
 * Content layer for production use.
 *
 * Configuration:
 * - Content root: Current working directory (Next.js project root)
 * - Caching: Disabled (static generation handles caching)
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
