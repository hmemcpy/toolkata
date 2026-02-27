import { Context, Layer } from "effect"

/**
 * Content service configuration.
 */
export interface ContentConfigService {
  readonly contentRoot: string
}

/**
 * Tag for the ContentConfig service.
 */
export class ContentConfig extends Context.Tag("ContentConfig")<
  ContentConfig,
  ContentConfigService
>() {}

/**
 * Creates a live layer for ContentConfig.
 *
 * @param contentRoot - Root directory for content files (used for path resolution)
 */
export const ContentConfigLive = (options: {
  readonly contentRoot: string
}): Layer.Layer<ContentConfig> =>
  Layer.succeed(ContentConfig, {
    contentRoot: options.contentRoot,
  })
