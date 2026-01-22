import { Data } from "effect"

export type ContentErrorCause = "NotFound" | "ParseError" | "ValidationError" | "IOError"

export class ContentError extends Data.TaggedClass("ContentError")<{
  readonly message: string
  readonly cause: ContentErrorCause
  readonly path?: string
  readonly contentType?: string
  readonly details?: unknown
}> {
  static notFound(path: string): ContentError {
    return new ContentError({
      message: `Content not found: ${path}`,
      cause: "NotFound",
      path,
    })
  }

  static parseError(path: string, details?: unknown): ContentError {
    return new ContentError({
      message: `Failed to parse frontmatter: ${path}`,
      cause: "ParseError",
      path,
      details,
    })
  }

  static validationError(path: string, contentType: string, details: unknown): ContentError {
    return new ContentError({
      message: `Validation failed for ${contentType} at ${path}`,
      cause: "ValidationError",
      path,
      contentType,
      details,
    })
  }

  static ioError(path: string, details?: unknown): ContentError {
    return new ContentError({
      message: `IO error: ${path}`,
      cause: "IOError",
      path,
      details,
    })
  }
}
