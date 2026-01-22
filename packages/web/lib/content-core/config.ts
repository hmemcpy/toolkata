import { Context, Layer } from "effect"

/**
 * Content service configuration.
 */
export interface ContentConfigService {
  readonly contentRoot: string
  readonly cache: {
    readonly enabled: boolean
    readonly ttl: number
  }
}

/**
 * Tag for the ContentConfig service.
 */
export class ContentConfig extends Context.Tag("ContentConfig")<
  ContentConfig,
  ContentConfigService
>() {}

/**
 * Default TTL for cache entries (5 minutes in milliseconds).
 */
const DEFAULT_CACHE_TTL = 5 * 60 * 1000

/**
 * Creates a live layer for ContentConfig from environment config.
 *
 * @param contentRoot - Root directory for content files
 * @param cacheEnabled - Whether caching is enabled
 * @param cacheTtl - Cache TTL in milliseconds (defaults to 5 minutes)
 */
export const ContentConfigLive = (options: {
  readonly contentRoot: string
  readonly cacheEnabled?: boolean
  readonly cacheTtl?: number
}): Layer.Layer<ContentConfig> =>
  Layer.succeed(ContentConfig, {
    contentRoot: options.contentRoot,
    cache: {
      enabled: options.cacheEnabled ?? false,
      ttl: options.cacheTtl ?? DEFAULT_CACHE_TTL,
    },
  })
