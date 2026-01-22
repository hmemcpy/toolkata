import type { z } from "zod"

/**
 * Represents a piece of content with typed frontmatter.
 */
export interface Content<T> {
  readonly frontmatter: T
  readonly content: string
  readonly slug: string
  readonly filePath: string
  readonly modifiedAt: Date
}

/**
 * Configuration for a content type with schema-based validation.
 */
export interface ContentType<T> {
  readonly name: string
  readonly schema: z.ZodType<T>
  readonly pathResolver?: (slug: string) => string
  readonly filePattern?: string
  readonly transform?: (raw: Content<unknown>) => Content<T>
}

/**
 * Creates a content type definition with Zod schema validation.
 *
 * @param config - Content type configuration
 * @returns A ContentType<T> for use with ContentService
 */
export function defineContentType<T>(config: ContentType<T>): ContentType<T> {
  return config
}
