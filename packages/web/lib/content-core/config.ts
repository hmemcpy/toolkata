import { Context, Layer } from "effect"
import type { GitHubContentSource } from "./github-loader"
import { DEFAULT_GITHUB_SOURCE } from "./github-loader"

/**
 * Content source type.
 */
export type ContentSource =
  | { readonly type: "local"; readonly root: string }
  | { readonly type: "github"; readonly source: GitHubContentSource }

/**
 * Content service configuration.
 */
export interface ContentConfigService {
  readonly contentRoot: string
  readonly source: ContentSource
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
 * @param contentRoot - Root directory for content files (used for path resolution)
 * @param source - Content source (local filesystem or GitHub)
 * @param cacheEnabled - Whether in-memory caching is enabled (only for local)
 * @param cacheTtl - Cache TTL in milliseconds (defaults to 5 minutes)
 */
export const ContentConfigLive = (options: {
  readonly contentRoot: string
  readonly source?: ContentSource
  readonly cacheEnabled?: boolean
  readonly cacheTtl?: number
}): Layer.Layer<ContentConfig> =>
  Layer.succeed(ContentConfig, {
    contentRoot: options.contentRoot,
    source: options.source ?? { type: "local", root: options.contentRoot },
    cache: {
      enabled: options.cacheEnabled ?? false,
      ttl: options.cacheTtl ?? DEFAULT_CACHE_TTL,
    },
  })

/**
 * Create a GitHub content source config.
 */
export const githubSource = (
  overrides?: Partial<GitHubContentSource> & { token?: string },
): ContentSource => ({
  type: "github",
  source: { ...DEFAULT_GITHUB_SOURCE, ...overrides },
})

/**
 * Create a local content source config.
 */
export const localSource = (root: string): ContentSource => ({
  type: "local",
  root,
})
