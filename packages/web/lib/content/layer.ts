/**
 * Content service layer configuration.
 *
 * Provides the Effect layer for ContentService.
 * Used by page components to load MDX content.
 *
 * Content is always loaded from the local filesystem (packages/web/content/).
 */

import {
  CacheServiceLive,
  ContentConfigLive,
  ContentServiceLive,
} from "../content-core"
import { Layer } from "effect"

/**
 * Content layer for production use.
 *
 * Loads content from the local filesystem.
 * Caching is disabled (Next.js handles caching at the page level).
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
