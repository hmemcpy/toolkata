/**
 * github-loader.ts - Fetch content from GitHub repository via API.
 *
 * Uses GitHub Contents API for all operations:
 * - Works with both public and private repos
 * - Supports OAuth tokens for user repos
 * - Leverages Next.js fetch caching with revalidation
 */

import { Effect } from "effect"
import { ContentError } from "./errors"
import type { LoadedFile } from "./loader"

/**
 * GitHub content source configuration.
 */
export interface GitHubContentSource {
  readonly owner: string
  readonly repo: string
  readonly branch: string
  readonly token?: string // Optional: for private repos or higher rate limits
}

/**
 * Default GitHub content source (toolkata-content repo).
 */
export const DEFAULT_GITHUB_SOURCE: GitHubContentSource = {
  owner: "hmemcpy",
  repo: "toolkata-content",
  branch: "main",
}

/**
 * Build GitHub Contents API URL for a file.
 *
 * @example
 * buildApiUrl({ owner: "hmemcpy", repo: "toolkata-content", branch: "main" }, "jj-git/lessons/01-step.mdx")
 * // => "https://api.github.com/repos/hmemcpy/toolkata-content/contents/jj-git/lessons/01-step.mdx?ref=main"
 */
export function buildApiUrl(source: GitHubContentSource, path: string): string {
  // Remove leading "./" or "content/" prefix if present
  const cleanPath = path.replace(/^\.?\/?(content\/)?/, "")
  return `https://api.github.com/repos/${source.owner}/${source.repo}/contents/${cleanPath}?ref=${source.branch}`
}

/**
 * Build request headers for GitHub API.
 */
function buildHeaders(source: GitHubContentSource): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "toolkata",
  }

  if (source.token) {
    headers["Authorization"] = `Bearer ${source.token}`
  }

  return headers
}

/**
 * GitHub Contents API response for a file.
 */
interface GitHubFileResponse {
  type: "file"
  content: string // base64 encoded
  encoding: "base64"
  sha: string
  size: number
  name: string
  path: string
}

/**
 * Fetch a file from GitHub via Contents API.
 *
 * Uses `next: { revalidate }` for ISR-style caching.
 * Cache is invalidated by on-demand revalidation via webhook.
 */
export function loadFileFromGitHub(
  path: string,
  source: GitHubContentSource = DEFAULT_GITHUB_SOURCE,
): Effect.Effect<LoadedFile, ContentError> {
  return Effect.gen(function* () {
    const url = buildApiUrl(source, path)

    const response = yield* Effect.tryPromise({
      try: () =>
        fetch(url, {
          headers: buildHeaders(source),
          next: {
            // Cache indefinitely, rely on on-demand revalidation
            revalidate: false,
            tags: [getPathTag(path)],
          },
        }),
      catch: (error) =>
        ContentError.ioError(path, {
          message: error instanceof Error ? error.message : String(error),
          url,
        }),
    })

    if (!response.ok) {
      if (response.status === 404) {
        return yield* Effect.fail(ContentError.notFound(path))
      }

      if (response.status === 403) {
        const remaining = response.headers.get("x-ratelimit-remaining")
        if (remaining === "0") {
          return yield* Effect.fail(
            ContentError.ioError(path, {
              message: "GitHub API rate limit exceeded. Add a token for higher limits.",
              url,
              status: 403,
            }),
          )
        }
      }

      return yield* Effect.fail(
        ContentError.ioError(path, {
          message: `GitHub API returned ${response.status}: ${response.statusText}`,
          url,
          status: response.status,
        }),
      )
    }

    const data = yield* Effect.tryPromise({
      try: () => response.json() as Promise<GitHubFileResponse>,
      catch: (error) =>
        ContentError.ioError(path, {
          message: error instanceof Error ? error.message : String(error),
          url,
        }),
    })

    if (data.type !== "file") {
      return yield* Effect.fail(
        ContentError.ioError(path, {
          message: `Expected file but got ${data.type}`,
          url,
        }),
      )
    }

    // Decode base64 content
    const raw = Buffer.from(data.content, "base64").toString("utf-8")

    // GitHub API doesn't return last-modified, use current time
    // (cache invalidation handles freshness)
    const modifiedAt = new Date()

    return {
      raw,
      modifiedAt,
    } as const
  })
}

/**
 * Generate a cache tag from a content path.
 *
 * @example
 * getPathTag("jj-git/lessons/01-step.mdx") // => "content:jj-git"
 */
export function getPathTag(path: string): string {
  // Extract tool pair from path (first directory)
  const match = path.match(/^\.?\/?(?:content\/)?([^/]+)/)
  const toolPair = match?.[1] ?? "unknown"
  return `content:${toolPair}`
}

/**
 * List files from GitHub repository using the Git Trees API.
 *
 * Gets the entire repository tree in one request, then filters by pattern.
 * Works with both public and private repos (with token).
 */
export function listFilesFromGitHub(
  pattern: string,
  source: GitHubContentSource = DEFAULT_GITHUB_SOURCE,
): Effect.Effect<ReadonlyArray<string>, ContentError> {
  return Effect.gen(function* () {
    // Use GitHub API to get repository tree
    const apiUrl = `https://api.github.com/repos/${source.owner}/${source.repo}/git/trees/${source.branch}?recursive=1`

    const response = yield* Effect.tryPromise({
      try: () =>
        fetch(apiUrl, {
          headers: buildHeaders(source),
          next: {
            // Cache tree for 5 minutes (listing is less critical)
            revalidate: 300,
          },
        }),
      catch: (error) =>
        ContentError.ioError(pattern, {
          message: error instanceof Error ? error.message : String(error),
          apiUrl,
        }),
    })

    if (!response.ok) {
      if (response.status === 403) {
        const remaining = response.headers.get("x-ratelimit-remaining")
        if (remaining === "0") {
          return yield* Effect.fail(
            ContentError.ioError(pattern, {
              message: "GitHub API rate limit exceeded. Add a token for higher limits.",
              apiUrl,
              status: 403,
            }),
          )
        }
      }

      return yield* Effect.fail(
        ContentError.ioError(pattern, {
          message: `GitHub API returned ${response.status}: ${response.statusText}`,
          apiUrl,
          status: response.status,
        }),
      )
    }

    const data = yield* Effect.tryPromise({
      try: () => response.json() as Promise<GitHubTreeResponse>,
      catch: (error) =>
        ContentError.ioError(pattern, {
          message: error instanceof Error ? error.message : String(error),
          apiUrl,
        }),
    })

    // Filter files by pattern
    // Convert glob pattern to regex (simplified)
    const regexPattern = patternToRegex(pattern)

    const files = data.tree
      .filter((item) => item.type === "blob" && regexPattern.test(item.path))
      .map((item) => item.path)

    return files
  })
}

interface GitHubTreeItem {
  path: string
  type: "blob" | "tree"
  sha: string
}

interface GitHubTreeResponse {
  tree: GitHubTreeItem[]
  truncated: boolean
}

/**
 * Convert a glob pattern to a regex (simplified).
 *
 * Supports: **, *, ?
 */
function patternToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&") // Escape special chars
    .replace(/\*\*/g, ".*") // ** matches anything
    .replace(/\*/g, "[^/]*") // * matches anything except /
    .replace(/\?/g, ".") // ? matches single char

  return new RegExp(`^${escaped}$`)
}
