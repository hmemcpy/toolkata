/**
 * service.ts - Main content service for loading and listing typed content.
 */

import * as path from "node:path"
import { Context, Effect, Layer } from "effect"
import { ContentConfig } from "./config"
import type { Content, ContentType } from "./content-type"
import { ContentError } from "./errors"
import { listFiles, loadFile } from "./loader"
import { parseFrontmatter } from "./parser"
import { validateFrontmatter } from "./validator"

/**
 * Options for the list operation.
 */
export interface ListOptions {
  readonly filter?: (content: Content<unknown>) => boolean
}

/**
 * ContentService interface.
 */
export interface ContentServiceShape {
  readonly load: <T>(type: ContentType<T>, slug: string) => Effect.Effect<Content<T>, ContentError>
  readonly list: <T>(
    type: ContentType<T>,
    options?: ListOptions,
  ) => Effect.Effect<ReadonlyArray<Content<T>>, ContentError>
}

/**
 * Tag for the ContentService.
 */
export class ContentService extends Context.Tag("ContentService")<
  ContentService,
  ContentServiceShape
>() {}

/**
 * Resolve the file path for a content item by slug.
 */
function resolveFilePath(
  type: ContentType<unknown>,
  slug: string,
  contentRoot: string,
): Effect.Effect<string, ContentError> {
  return Effect.try({
    try: () => {
      if (type.pathResolver) {
        return type.pathResolver(slug)
      }
      const resolved = path.join(contentRoot, `${slug}.mdx`)
      return resolved
    },
    catch: (error) =>
      ContentError.ioError(
        path.join(contentRoot, `${slug}.mdx`),
        error instanceof Error ? error.message : String(error),
      ),
  })
}

/**
 * Extract slug from a file path.
 */
function extractSlug(filePath: string, contentRoot: string): string {
  const relative = path.relative(contentRoot, filePath)
  return relative.replace(/\.mdx$/, "")
}

/**
 * Create the ContentService implementation.
 */
const makeContentService = Effect.gen(function* () {
  const config = yield* ContentConfig

  const load = <T>(type: ContentType<T>, slug: string): Effect.Effect<Content<T>, ContentError> =>
    Effect.gen(function* () {
      const filePath = yield* resolveFilePath(type, slug, config.contentRoot)

      const file = yield* loadFile(filePath)
      const parsed = yield* parseFrontmatter(file.raw)
      const validated = yield* validateFrontmatter(type.schema, parsed.data, filePath, type.name)

      const baseContent: Content<unknown> = {
        frontmatter: validated,
        content: parsed.content,
        slug,
        filePath,
        modifiedAt: file.modifiedAt,
      }

      const finalContent = type.transform
        ? type.transform(baseContent)
        : (baseContent as Content<T>)

      return finalContent
    })

  const list = <T>(
    type: ContentType<T>,
    options?: ListOptions,
  ): Effect.Effect<ReadonlyArray<Content<T>>, ContentError> =>
    Effect.gen(function* () {
      const pattern = type.filePattern ?? "**/*.mdx"
      const relativePaths = yield* listFiles(pattern, config.contentRoot)

      const contents: Content<T>[] = []
      for (const relativePath of relativePaths) {
        const filePath = path.join(config.contentRoot, relativePath)
        const slug = extractSlug(filePath, config.contentRoot)

        const result = yield* Effect.either(load(type, slug))

        if (result._tag === "Right") {
          if (options?.filter === undefined || options.filter(result.right as Content<unknown>)) {
            contents.push(result.right)
          }
        }
      }

      contents.sort((a, b) => a.slug.localeCompare(b.slug))

      return contents
    })

  return {
    load,
    list,
  } satisfies ContentServiceShape
})

/**
 * Live layer for ContentService.
 */
export const ContentServiceLive = Layer.effect(ContentService, makeContentService)
