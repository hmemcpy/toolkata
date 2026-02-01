/**
 * CMSClient - Effect-TS client service for Content CMS API endpoints.
 *
 * Manages communication with the sandbox API's CMS routes:
 * - /admin/cms/status - CMS availability status
 * - /admin/cms/files - File listing (tree view)
 * - /admin/cms/file/* - File operations (read, create, update, delete)
 * - /admin/cms/branches - Branch operations
 * - /admin/cms/commits - Commit operations
 * - /admin/cms/pr - Pull request operations
 * - /admin/cms/validate - Content validation
 *
 * All requests require X-Admin-Key header authentication.
 *
 * @see specs/content-cms.md for full specification
 *
 * @example
 * ```ts
 * import { CMSClient } from "./services/cms-client"
 *
 * const program = Effect.gen(function* () {
 *   const client = yield* CMSClient
 *   const files = yield* client.listFiles()
 *   return files
 * })
 * ```
 */

import { Context, Data, Effect, Layer } from "effect"
import { getSandboxHttpUrl, ADMIN_API_KEY } from "@/lib/sandbox-url"

// ============================================================================
// Error Types
// ============================================================================

export type CMSClientErrorCause =
  | "NetworkError"
  | "Unauthorized"
  | "NotFound"
  | "ServerError"
  | "InvalidResponse"
  | "RateLimited"
  | "ConflictError"
  | "ValidationFailed"
  | "NotConfigured"

export class CMSClientError extends Data.TaggedClass("CMSClientError")<{
  readonly cause: CMSClientErrorCause
  readonly message: string
  readonly status?: number
  readonly originalError?: unknown
}> {}

// ============================================================================
// Data Models (mirrors backend types)
// ============================================================================

/**
 * Content file from repository.
 */
export interface ContentFile {
  readonly path: string
  readonly name: string
  readonly type: "file" | "dir"
  readonly size: number
  readonly sha: string
  readonly url: string
}

/**
 * GitHub branch info.
 */
export interface GitHubBranch {
  readonly name: string
  readonly sha: string
  readonly protected: boolean
}

/**
 * GitHub commit info.
 */
export interface GitHubCommit {
  readonly sha: string
  readonly shortSha: string
  readonly message: string
  readonly author: {
    readonly name: string
    readonly email: string
    readonly date: number
  }
  readonly committer: {
    readonly name: string
    readonly email: string
    readonly date: number
  }
  readonly parents: readonly string[]
}

/**
 * File content from repository.
 */
export interface FileContent {
  readonly path: string
  readonly content: string
  readonly sha: string
  readonly encoding: "utf-8" | "base64"
}

/**
 * GitHub pull request info.
 */
export interface GitHubPullRequest {
  readonly number: number
  readonly title: string
  readonly state: "open" | "closed" | "merged"
  readonly htmlUrl: string
  readonly head: {
    readonly ref: string
    readonly sha: string
  }
  readonly base: {
    readonly ref: string
  }
  readonly createdAt: number
  readonly updatedAt: number
}

/**
 * File to commit.
 */
export interface CommitFile {
  readonly path: string
  readonly content: string
}

/**
 * Commit author.
 */
export interface CommitAuthor {
  readonly name: string
  readonly email: string
}

/**
 * File change in a commit diff.
 */
export interface FileChange {
  readonly filename: string
  readonly status: "added" | "removed" | "modified" | "renamed"
  readonly additions: number
  readonly deletions: number
  readonly patch?: string
  readonly previousFilename?: string
}

/**
 * Commit diff with file changes.
 */
export interface CommitDiff {
  readonly sha: string
  readonly files: readonly FileChange[]
  readonly additions: number
  readonly deletions: number
}

/**
 * Snippet validation error.
 */
export interface SnippetError {
  readonly line: number
  readonly column?: number
  readonly message: string
  readonly type: "syntax" | "compilation" | "runtime" | "missing-image"
}

/**
 * Snippet validation result.
 */
export interface SnippetValidationResult {
  readonly file: string
  readonly valid: boolean
  readonly errors: readonly SnippetError[]
  readonly duration: number
  readonly timestamp: number
}

/**
 * Validation request.
 */
export interface ValidationRequest {
  readonly path: string
  readonly content: string
  readonly toolPair: string
}

/**
 * CMS status response.
 */
export interface CMSStatus {
  readonly available: boolean
  readonly repository: string | null
  readonly defaultBranch: string | null
}

/**
 * Validation status response.
 */
export interface ValidationStatus {
  readonly available: boolean
  readonly reason: string | null
}

// ============================================================================
// Response Types
// ============================================================================

interface FilesResponse {
  readonly files: readonly ContentFile[]
  readonly totalCount: number
}

interface BranchesResponse {
  readonly branches: readonly GitHubBranch[]
}

interface CommitsResponse {
  readonly commits: readonly GitHubCommit[]
}

interface FileCommitResponse {
  readonly success: boolean
  readonly commit: GitHubCommit
  readonly branch: string
}

interface BranchResponse {
  readonly branch: GitHubBranch
  readonly success: boolean
}

interface PRResponse {
  readonly pr: GitHubPullRequest
  readonly success: boolean
}

interface ValidationResponse {
  readonly results: readonly SnippetValidationResult[]
}

// ============================================================================
// Request Types
// ============================================================================

/**
 * Request to create a new file.
 */
export interface CreateFileRequest {
  readonly content: string
  readonly message: string
  readonly branch?: string
}

/**
 * Request to update an existing file.
 */
export interface UpdateFileRequest {
  readonly content: string
  readonly message: string
  readonly sha: string
  readonly branch: string
}

/**
 * Request to delete a file.
 */
export interface DeleteFileRequest {
  readonly message: string
  readonly sha: string
  readonly branch: string
}

/**
 * Request to rename a file.
 */
export interface RenameFileRequest {
  readonly newPath: string
  readonly message: string
  readonly branch: string
}

/**
 * Request to create a branch.
 */
export interface CreateBranchRequest {
  readonly name: string
  readonly from?: string
}

/**
 * Request to create a commit.
 */
export interface CreateCommitRequest {
  readonly branch: string
  readonly message: string
  readonly files: readonly CommitFile[]
  readonly author?: CommitAuthor
}

/**
 * Request to create a pull request.
 */
export interface CreatePRRequest {
  readonly head: string
  readonly base?: string
  readonly title: string
  readonly body?: string
}

// ============================================================================
// Service Interface
// ============================================================================

export interface CMSClientShape {
  // Status
  readonly getStatus: () => Effect.Effect<CMSStatus, CMSClientError>
  readonly getValidationStatus: () => Effect.Effect<ValidationStatus, CMSClientError>

  // File operations
  readonly listFiles: (params?: {
    path?: string
    branch?: string
  }) => Effect.Effect<FilesResponse, CMSClientError>

  readonly getFile: (
    path: string,
    branch?: string,
  ) => Effect.Effect<FileContent, CMSClientError>

  readonly createFile: (
    path: string,
    request: CreateFileRequest,
  ) => Effect.Effect<FileCommitResponse, CMSClientError>

  readonly updateFile: (
    path: string,
    request: UpdateFileRequest,
  ) => Effect.Effect<FileCommitResponse, CMSClientError>

  readonly deleteFile: (
    path: string,
    request: DeleteFileRequest,
  ) => Effect.Effect<FileCommitResponse, CMSClientError>

  readonly renameFile: (
    oldPath: string,
    request: RenameFileRequest,
  ) => Effect.Effect<FileCommitResponse, CMSClientError>

  // Branch operations
  readonly listBranches: () => Effect.Effect<BranchesResponse, CMSClientError>

  readonly createBranch: (
    request: CreateBranchRequest,
  ) => Effect.Effect<BranchResponse, CMSClientError>

  readonly deleteBranch: (name: string) => Effect.Effect<void, CMSClientError>

  // Commit operations
  readonly getCommitHistory: (params?: {
    path?: string
    branch?: string
    limit?: number
  }) => Effect.Effect<CommitsResponse, CMSClientError>

  readonly getCommit: (sha: string) => Effect.Effect<GitHubCommit, CMSClientError>

  readonly getCommitDiff: (sha: string) => Effect.Effect<CommitDiff, CMSClientError>

  readonly createCommit: (
    request: CreateCommitRequest,
  ) => Effect.Effect<FileCommitResponse, CMSClientError>

  // PR operations
  readonly createPR: (
    request: CreatePRRequest,
  ) => Effect.Effect<PRResponse, CMSClientError>

  readonly getPR: (number: number) => Effect.Effect<GitHubPullRequest, CMSClientError>

  // Validation
  readonly validateContent: (
    files: readonly ValidationRequest[],
  ) => Effect.Effect<ValidationResponse, CMSClientError>
}

/**
 * CMSClient tag for dependency injection.
 */
export class CMSClient extends Context.Tag("CMSClient")<CMSClient, CMSClientShape>() {}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse CMS API error from response.
 */
function parseCMSError(status: number, body: unknown): CMSClientError {
  const errorBody = body as { error?: string; message?: string } | undefined

  if (status === 401 || status === 403) {
    return new CMSClientError({
      cause: "Unauthorized",
      message: errorBody?.message ?? "Invalid or missing admin API key",
      status,
    })
  }

  if (status === 404) {
    return new CMSClientError({
      cause: "NotFound",
      message: errorBody?.message ?? "Resource not found",
      status,
    })
  }

  if (status === 409) {
    return new CMSClientError({
      cause: "ConflictError",
      message: errorBody?.message ?? "Conflict - resource may have been modified",
      status,
    })
  }

  if (status === 422) {
    return new CMSClientError({
      cause: "ValidationFailed",
      message: errorBody?.message ?? "Validation failed",
      status,
    })
  }

  if (status === 429) {
    return new CMSClientError({
      cause: "RateLimited",
      message: errorBody?.message ?? "GitHub API rate limit exceeded",
      status,
    })
  }

  if (status === 503) {
    return new CMSClientError({
      cause: "NotConfigured",
      message: errorBody?.message ?? "CMS is not configured",
      status,
    })
  }

  if (status >= 500) {
    return new CMSClientError({
      cause: "ServerError",
      message: errorBody?.message ?? "Internal server error",
      status,
    })
  }

  return new CMSClientError({
    cause: "InvalidResponse",
    message: `Unexpected response: ${status}`,
    status,
    originalError: body,
  })
}

/**
 * Build admin API headers.
 */
function getCMSHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  if (ADMIN_API_KEY !== "") {
    headers["X-Admin-Key"] = ADMIN_API_KEY
  }

  return headers
}

/**
 * Make a fetch request with error handling.
 */
async function fetchCMS<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getCMSHeaders(),
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => undefined)
    throw parseCMSError(response.status, body)
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

// ============================================================================
// Service Implementation
// ============================================================================

const make = Effect.succeed<CMSClientShape>({
  // Status
  getStatus: () =>
    Effect.tryPromise({
      try: async () => {
        const apiUrl = getSandboxHttpUrl()
        return fetchCMS<CMSStatus>(`${apiUrl}/admin/cms/status`)
      },
      catch: (error) =>
        error instanceof CMSClientError
          ? error
          : new CMSClientError({
              cause: "NetworkError",
              message: error instanceof Error ? error.message : "Failed to fetch CMS status",
              originalError: error,
            }),
    }),

  getValidationStatus: () =>
    Effect.tryPromise({
      try: async () => {
        const apiUrl = getSandboxHttpUrl()
        return fetchCMS<ValidationStatus>(`${apiUrl}/admin/cms/validate/status`)
      },
      catch: (error) =>
        error instanceof CMSClientError
          ? error
          : new CMSClientError({
              cause: "NetworkError",
              message: error instanceof Error ? error.message : "Failed to fetch validation status",
              originalError: error,
            }),
    }),

  // File operations
  listFiles: (params) =>
    Effect.tryPromise({
      try: async () => {
        const apiUrl = getSandboxHttpUrl()
        const searchParams = new URLSearchParams()
        if (params?.path) searchParams.set("path", params.path)
        if (params?.branch) searchParams.set("branch", params.branch)
        const queryString = searchParams.toString()
        const url = queryString
          ? `${apiUrl}/admin/cms/files?${queryString}`
          : `${apiUrl}/admin/cms/files`
        return fetchCMS<FilesResponse>(url)
      },
      catch: (error) =>
        error instanceof CMSClientError
          ? error
          : new CMSClientError({
              cause: "NetworkError",
              message: error instanceof Error ? error.message : "Failed to list files",
              originalError: error,
            }),
    }),

  getFile: (path, branch) =>
    Effect.tryPromise({
      try: async () => {
        const apiUrl = getSandboxHttpUrl()
        const encodedPath = encodeURIComponent(path)
        const searchParams = new URLSearchParams()
        if (branch) searchParams.set("branch", branch)
        const queryString = searchParams.toString()
        const url = queryString
          ? `${apiUrl}/admin/cms/file/${encodedPath}?${queryString}`
          : `${apiUrl}/admin/cms/file/${encodedPath}`
        return fetchCMS<FileContent>(url)
      },
      catch: (error) =>
        error instanceof CMSClientError
          ? error
          : new CMSClientError({
              cause: "NetworkError",
              message: error instanceof Error ? error.message : "Failed to get file",
              originalError: error,
            }),
    }),

  createFile: (path, request) =>
    Effect.tryPromise({
      try: async () => {
        const apiUrl = getSandboxHttpUrl()
        const encodedPath = encodeURIComponent(path)
        return fetchCMS<FileCommitResponse>(`${apiUrl}/admin/cms/file/${encodedPath}`, {
          method: "PUT",
          body: JSON.stringify(request),
        })
      },
      catch: (error) =>
        error instanceof CMSClientError
          ? error
          : new CMSClientError({
              cause: "NetworkError",
              message: error instanceof Error ? error.message : "Failed to create file",
              originalError: error,
            }),
    }),

  updateFile: (path, request) =>
    Effect.tryPromise({
      try: async () => {
        const apiUrl = getSandboxHttpUrl()
        const encodedPath = encodeURIComponent(path)
        return fetchCMS<FileCommitResponse>(`${apiUrl}/admin/cms/file/${encodedPath}`, {
          method: "PUT",
          body: JSON.stringify(request),
        })
      },
      catch: (error) =>
        error instanceof CMSClientError
          ? error
          : new CMSClientError({
              cause: "NetworkError",
              message: error instanceof Error ? error.message : "Failed to update file",
              originalError: error,
            }),
    }),

  deleteFile: (path, request) =>
    Effect.tryPromise({
      try: async () => {
        const apiUrl = getSandboxHttpUrl()
        const encodedPath = encodeURIComponent(path)
        return fetchCMS<FileCommitResponse>(`${apiUrl}/admin/cms/file/${encodedPath}`, {
          method: "DELETE",
          body: JSON.stringify(request),
        })
      },
      catch: (error) =>
        error instanceof CMSClientError
          ? error
          : new CMSClientError({
              cause: "NetworkError",
              message: error instanceof Error ? error.message : "Failed to delete file",
              originalError: error,
            }),
    }),

  renameFile: (oldPath, request) =>
    Effect.tryPromise({
      try: async () => {
        const apiUrl = getSandboxHttpUrl()
        const encodedPath = encodeURIComponent(oldPath)
        return fetchCMS<FileCommitResponse>(`${apiUrl}/admin/cms/file/${encodedPath}`, {
          method: "PATCH",
          body: JSON.stringify(request),
        })
      },
      catch: (error) =>
        error instanceof CMSClientError
          ? error
          : new CMSClientError({
              cause: "NetworkError",
              message: error instanceof Error ? error.message : "Failed to rename file",
              originalError: error,
            }),
    }),

  // Branch operations
  listBranches: () =>
    Effect.tryPromise({
      try: async () => {
        const apiUrl = getSandboxHttpUrl()
        return fetchCMS<BranchesResponse>(`${apiUrl}/admin/cms/branches`)
      },
      catch: (error) =>
        error instanceof CMSClientError
          ? error
          : new CMSClientError({
              cause: "NetworkError",
              message: error instanceof Error ? error.message : "Failed to list branches",
              originalError: error,
            }),
    }),

  createBranch: (request) =>
    Effect.tryPromise({
      try: async () => {
        const apiUrl = getSandboxHttpUrl()
        return fetchCMS<BranchResponse>(`${apiUrl}/admin/cms/branches`, {
          method: "POST",
          body: JSON.stringify(request),
        })
      },
      catch: (error) =>
        error instanceof CMSClientError
          ? error
          : new CMSClientError({
              cause: "NetworkError",
              message: error instanceof Error ? error.message : "Failed to create branch",
              originalError: error,
            }),
    }),

  deleteBranch: (name) =>
    Effect.tryPromise({
      try: async () => {
        const apiUrl = getSandboxHttpUrl()
        await fetchCMS<{ success: boolean }>(`${apiUrl}/admin/cms/branches/${encodeURIComponent(name)}`, {
          method: "DELETE",
        })
      },
      catch: (error) =>
        error instanceof CMSClientError
          ? error
          : new CMSClientError({
              cause: "NetworkError",
              message: error instanceof Error ? error.message : "Failed to delete branch",
              originalError: error,
            }),
    }),

  // Commit operations
  getCommitHistory: (params) =>
    Effect.tryPromise({
      try: async () => {
        const apiUrl = getSandboxHttpUrl()
        const searchParams = new URLSearchParams()
        if (params?.path) searchParams.set("path", params.path)
        if (params?.branch) searchParams.set("branch", params.branch)
        if (params?.limit !== undefined) searchParams.set("limit", params.limit.toString())
        const queryString = searchParams.toString()
        const url = queryString
          ? `${apiUrl}/admin/cms/commits?${queryString}`
          : `${apiUrl}/admin/cms/commits`
        return fetchCMS<CommitsResponse>(url)
      },
      catch: (error) =>
        error instanceof CMSClientError
          ? error
          : new CMSClientError({
              cause: "NetworkError",
              message: error instanceof Error ? error.message : "Failed to get commit history",
              originalError: error,
            }),
    }),

  getCommit: (sha) =>
    Effect.tryPromise({
      try: async () => {
        const apiUrl = getSandboxHttpUrl()
        return fetchCMS<GitHubCommit>(`${apiUrl}/admin/cms/commits/${encodeURIComponent(sha)}`)
      },
      catch: (error) =>
        error instanceof CMSClientError
          ? error
          : new CMSClientError({
              cause: "NetworkError",
              message: error instanceof Error ? error.message : "Failed to get commit",
              originalError: error,
            }),
    }),

  getCommitDiff: (sha) =>
    Effect.tryPromise({
      try: async () => {
        const apiUrl = getSandboxHttpUrl()
        return fetchCMS<CommitDiff>(`${apiUrl}/admin/cms/commits/${encodeURIComponent(sha)}/diff`)
      },
      catch: (error) =>
        error instanceof CMSClientError
          ? error
          : new CMSClientError({
              cause: "NetworkError",
              message: error instanceof Error ? error.message : "Failed to get commit diff",
              originalError: error,
            }),
    }),

  createCommit: (request) =>
    Effect.tryPromise({
      try: async () => {
        const apiUrl = getSandboxHttpUrl()
        return fetchCMS<FileCommitResponse>(`${apiUrl}/admin/cms/commits`, {
          method: "POST",
          body: JSON.stringify(request),
        })
      },
      catch: (error) =>
        error instanceof CMSClientError
          ? error
          : new CMSClientError({
              cause: "NetworkError",
              message: error instanceof Error ? error.message : "Failed to create commit",
              originalError: error,
            }),
    }),

  // PR operations
  createPR: (request) =>
    Effect.tryPromise({
      try: async () => {
        const apiUrl = getSandboxHttpUrl()
        return fetchCMS<PRResponse>(`${apiUrl}/admin/cms/pr`, {
          method: "POST",
          body: JSON.stringify(request),
        })
      },
      catch: (error) =>
        error instanceof CMSClientError
          ? error
          : new CMSClientError({
              cause: "NetworkError",
              message: error instanceof Error ? error.message : "Failed to create PR",
              originalError: error,
            }),
    }),

  getPR: (number) =>
    Effect.tryPromise({
      try: async () => {
        const apiUrl = getSandboxHttpUrl()
        return fetchCMS<GitHubPullRequest>(`${apiUrl}/admin/cms/pr/${number}`)
      },
      catch: (error) =>
        error instanceof CMSClientError
          ? error
          : new CMSClientError({
              cause: "NetworkError",
              message: error instanceof Error ? error.message : "Failed to get PR",
              originalError: error,
            }),
    }),

  // Validation
  validateContent: (files) =>
    Effect.tryPromise({
      try: async () => {
        const apiUrl = getSandboxHttpUrl()
        return fetchCMS<ValidationResponse>(`${apiUrl}/admin/cms/validate`, {
          method: "POST",
          body: JSON.stringify({ files }),
        })
      },
      catch: (error) =>
        error instanceof CMSClientError
          ? error
          : new CMSClientError({
              cause: "NetworkError",
              message: error instanceof Error ? error.message : "Failed to validate content",
              originalError: error,
            }),
    }),
})

/**
 * Live layer for CMSClient.
 *
 * Provides the real implementation for browser use.
 */
export const CMSClientLive = Layer.effect(CMSClient, make)
