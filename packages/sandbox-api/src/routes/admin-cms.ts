import { Effect } from "effect"
import { Hono } from "hono"
import type { Env } from "hono"
import {
  GitHubConfig,
  GitHubConfigError,
  isGitHubConfigured,
} from "../config/github.js"
import {
  GitHubError,
  type GitHubServiceShape,
  type ContentFile,
  type GitHubBranch,
  type GitHubCommit,
  type GitHubPullRequest,
  type CommitFile,
  type CommitAuthor,
} from "../services/github.js"
import {
  ContentValidationError,
  type ContentValidationServiceShape,
  type SnippetValidationResult,
  type ValidationRequest,
} from "../services/content-validation.js"

/**
 * Admin CMS routes for Content Management System
 *
 * These routes provide GitHub-based content management:
 * - File operations: GET/PUT/DELETE files via GitHub API
 * - Branch operations: list, create, delete branches
 * - Commit operations: view history, create commits
 * - PR operations: create pull requests
 * - Validation: run snippet validation on content
 *
 * Protected by admin middleware (X-Admin-Key header)
 *
 * @see specs/content-cms.md for full specification
 */

// ============================================================================
// Response Types (from specs/content-cms.md)
// ============================================================================

export interface FilesResponse {
  readonly files: readonly ContentFile[]
  readonly totalCount: number
}

export interface FileResponse {
  readonly path: string
  readonly content: string
  readonly sha: string
  readonly encoding: "utf-8" | "base64"
}

export interface FileCommitResponse {
  readonly success: boolean
  readonly commit: GitHubCommit
  readonly branch: string
}

export interface BranchesResponse {
  readonly branches: readonly GitHubBranch[]
}

export interface BranchResponse {
  readonly branch: GitHubBranch
  readonly success: boolean
}

export interface CommitsResponse {
  readonly commits: readonly GitHubCommit[]
}

export interface PRResponse {
  readonly pr: GitHubPullRequest
  readonly success: boolean
}

export interface ValidationResponse {
  readonly results: readonly SnippetValidationResult[]
}

export interface ErrorResponse {
  readonly error: string
  readonly message: string
}

// ============================================================================
// Request Body Types
// ============================================================================

export interface CreateFileRequest {
  readonly content: string
  readonly message: string
  readonly branch?: string
}

export interface UpdateFileRequest {
  readonly content: string
  readonly message: string
  readonly sha: string
  readonly branch: string
}

export interface DeleteFileRequest {
  readonly message: string
  readonly sha: string
  readonly branch: string
}

export interface CreateBranchRequest {
  readonly name: string
  readonly from?: string
}

export interface CreateCommitRequest {
  readonly branch: string
  readonly message: string
  readonly files: readonly CommitFile[]
  readonly author?: CommitAuthor
}

export interface CreatePRRequest {
  readonly head: string
  readonly base?: string
  readonly title: string
  readonly body?: string
}

export interface ValidateRequest {
  readonly files: readonly ValidationRequest[]
}

// ============================================================================
// Error Handling
// ============================================================================

// Valid status codes for admin CMS responses
type AdminCMSStatusCode = 200 | 201 | 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 503

const toStatusCode = (code: number): AdminCMSStatusCode => {
  if ([200, 201, 400, 401, 403, 404, 409, 422, 429, 500, 503].includes(code)) {
    return code as AdminCMSStatusCode
  }
  return 500
}

// Sanitized error messages for external responses
const SANITIZED_MESSAGES = {
  NotFound: "Resource not found",
  Unauthorized: "GitHub authentication failed",
  RateLimited: "GitHub API rate limit exceeded",
  ValidationFailed: "Validation failed",
  ConflictError: "Conflict - resource may have been modified",
  NetworkError: "Network error communicating with GitHub",
  UnknownError: "An unexpected error occurred",
  NotConfigured: "Content CMS is not configured",
  DockerNotAvailable: "Docker is not available for validation",
  ImageNotFound: "Docker image not found",
  ContainerFailed: "Container execution failed",
  Timeout: "Operation timed out",
  ParseError: "Failed to parse content",
  BadRequest: "Invalid request",
} as const

/**
 * Convert errors to HTTP response
 */
const errorToResponse = (error: unknown): { statusCode: number; body: ErrorResponse } => {
  if (error instanceof GitHubConfigError) {
    return {
      statusCode: 503,
      body: {
        error: error.cause,
        message: SANITIZED_MESSAGES.NotConfigured,
      },
    }
  }

  if (error instanceof GitHubError) {
    const statusMap: Record<string, number> = {
      NotFound: 404,
      Unauthorized: 401,
      RateLimited: 429,
      ValidationFailed: 422,
      ConflictError: 409,
      NetworkError: 503,
      UnknownError: 500,
    }

    const messageKey = error.cause as keyof typeof SANITIZED_MESSAGES
    return {
      statusCode: statusMap[error.cause] ?? 500,
      body: {
        error: error.cause,
        message: SANITIZED_MESSAGES[messageKey] ?? SANITIZED_MESSAGES.UnknownError,
      },
    }
  }

  if (error instanceof ContentValidationError) {
    const statusMap: Record<string, number> = {
      DockerNotAvailable: 503,
      ImageNotFound: 503,
      ContainerFailed: 500,
      Timeout: 504,
      ParseError: 400,
      UnknownError: 500,
    }

    const messageKey = error.cause as keyof typeof SANITIZED_MESSAGES
    return {
      statusCode: statusMap[error.cause] ?? 500,
      body: {
        error: error.cause,
        message: SANITIZED_MESSAGES[messageKey] ?? SANITIZED_MESSAGES.UnknownError,
      },
    }
  }

  return {
    statusCode: 500,
    body: {
      error: "InternalError",
      message: SANITIZED_MESSAGES.UnknownError,
    },
  }
}

// ============================================================================
// Route Factory
// ============================================================================

/**
 * Create admin CMS routes with service instances
 *
 * @param githubService - GitHub service for repository operations
 * @param validationService - Content validation service (optional)
 */
export const createAdminCMSRoutes = (
  githubService: GitHubServiceShape,
  validationService?: ContentValidationServiceShape,
) => {
  const app = new Hono<{ Bindings: Env }>()

  // ============================================================================
  // Service Availability Check
  // ============================================================================

  // GET /status - Check if CMS is available
  app.get("/status", (c) => {
    const configured = isGitHubConfigured()
    return c.json({
      available: configured,
      repository: configured ? `${GitHubConfig.owner}/${GitHubConfig.repo}` : null,
      defaultBranch: configured ? GitHubConfig.defaultBranch : null,
    })
  })

  // ============================================================================
  // File Operations
  // ============================================================================

  // GET /files - List files from content repository
  app.get("/files", async (c) => {
    try {
      const path = c.req.query("path")
      const branch = c.req.query("branch")

      const files = await Effect.runPromise(
        githubService.getTree(path ?? undefined, branch ?? undefined),
      )

      return c.json<FilesResponse>(
        {
          files,
          totalCount: files.length,
        },
        200,
      )
    } catch (error) {
      const { statusCode, body } = errorToResponse(error)
      return c.json<ErrorResponse>(body, toStatusCode(statusCode))
    }
  })

  // GET /file/:path - Read a file from content repository
  app.get("/file/*", async (c) => {
    try {
      // Get path from wildcard - everything after /file/
      const filePath = c.req.path.replace(/^\/file\//, "")
      if (!filePath) {
        return c.json<ErrorResponse>(
          { error: "BadRequest", message: "Missing file path" },
          400,
        )
      }

      const branch = c.req.query("branch")

      const fileContent = await Effect.runPromise(
        githubService.getFile(decodeURIComponent(filePath), branch ?? undefined),
      )

      return c.json<FileResponse>(
        {
          path: fileContent.path,
          content: fileContent.content,
          sha: fileContent.sha,
          encoding: fileContent.encoding,
        },
        200,
      )
    } catch (error) {
      const { statusCode, body } = errorToResponse(error)
      return c.json<ErrorResponse>(body, toStatusCode(statusCode))
    }
  })

  // PUT /file/:path - Create or update a file
  app.put("/file/*", async (c) => {
    try {
      // Get path from wildcard
      const filePath = c.req.path.replace(/^\/file\//, "")
      if (!filePath) {
        return c.json<ErrorResponse>(
          { error: "BadRequest", message: "Missing file path" },
          400,
        )
      }

      const body = (await c.req.json()) as CreateFileRequest | UpdateFileRequest

      if (!body.content || typeof body.content !== "string") {
        return c.json<ErrorResponse>(
          { error: "BadRequest", message: "Missing or invalid content" },
          400,
        )
      }

      if (!body.message || typeof body.message !== "string") {
        return c.json<ErrorResponse>(
          { error: "BadRequest", message: "Missing or invalid commit message" },
          400,
        )
      }

      const decodedPath = decodeURIComponent(filePath)

      // Check if this is an update (has sha) or create
      if ("sha" in body && body.sha) {
        // Update existing file
        const updateBody = body as UpdateFileRequest
        if (!updateBody.branch || typeof updateBody.branch !== "string") {
          return c.json<ErrorResponse>(
            { error: "BadRequest", message: "Missing or invalid branch for update" },
            400,
          )
        }

        const commit = await Effect.runPromise(
          githubService.updateFile(
            decodedPath,
            updateBody.content,
            updateBody.message,
            updateBody.sha,
            updateBody.branch,
          ),
        )

        return c.json<FileCommitResponse>(
          {
            success: true,
            commit,
            branch: updateBody.branch,
          },
          200,
        )
      }

      // Create new file
      const createBody = body as CreateFileRequest
      const branch = createBody.branch ?? GitHubConfig.defaultBranch

      const commit = await Effect.runPromise(
        githubService.createFile(decodedPath, createBody.content, createBody.message, branch),
      )

      return c.json<FileCommitResponse>(
        {
          success: true,
          commit,
          branch,
        },
        201,
      )
    } catch (error) {
      const { statusCode, body } = errorToResponse(error)
      return c.json<ErrorResponse>(body, toStatusCode(statusCode))
    }
  })

  // DELETE /file/:path - Delete a file
  app.delete("/file/*", async (c) => {
    try {
      // Get path from wildcard
      const filePath = c.req.path.replace(/^\/file\//, "")
      if (!filePath) {
        return c.json<ErrorResponse>(
          { error: "BadRequest", message: "Missing file path" },
          400,
        )
      }

      const body = (await c.req.json()) as DeleteFileRequest

      if (!body.message || typeof body.message !== "string") {
        return c.json<ErrorResponse>(
          { error: "BadRequest", message: "Missing or invalid commit message" },
          400,
        )
      }

      if (!body.sha || typeof body.sha !== "string") {
        return c.json<ErrorResponse>(
          { error: "BadRequest", message: "Missing or invalid sha" },
          400,
        )
      }

      if (!body.branch || typeof body.branch !== "string") {
        return c.json<ErrorResponse>(
          { error: "BadRequest", message: "Missing or invalid branch" },
          400,
        )
      }

      const commit = await Effect.runPromise(
        githubService.deleteFile(
          decodeURIComponent(filePath),
          body.message,
          body.sha,
          body.branch,
        ),
      )

      return c.json<FileCommitResponse>(
        {
          success: true,
          commit,
          branch: body.branch,
        },
        200,
      )
    } catch (error) {
      const { statusCode, body } = errorToResponse(error)
      return c.json<ErrorResponse>(body, toStatusCode(statusCode))
    }
  })

  // ============================================================================
  // Branch Operations
  // ============================================================================

  // GET /branches - List branches
  app.get("/branches", async (c) => {
    try {
      const branches = await Effect.runPromise(githubService.listBranches())

      return c.json<BranchesResponse>({ branches }, 200)
    } catch (error) {
      const { statusCode, body } = errorToResponse(error)
      return c.json<ErrorResponse>(body, toStatusCode(statusCode))
    }
  })

  // POST /branches - Create a new branch
  app.post("/branches", async (c) => {
    try {
      const body = (await c.req.json()) as CreateBranchRequest

      if (!body.name || typeof body.name !== "string") {
        return c.json<ErrorResponse>(
          { error: "BadRequest", message: "Missing or invalid branch name" },
          400,
        )
      }

      const branch = await Effect.runPromise(
        githubService.createBranch(body.name, body.from ?? undefined),
      )

      return c.json<BranchResponse>({ branch, success: true }, 201)
    } catch (error) {
      const { statusCode, body } = errorToResponse(error)
      return c.json<ErrorResponse>(body, toStatusCode(statusCode))
    }
  })

  // DELETE /branches/:name - Delete a branch
  app.delete("/branches/:name", async (c) => {
    try {
      const name = c.req.param("name")
      if (!name) {
        return c.json<ErrorResponse>(
          { error: "BadRequest", message: "Missing branch name" },
          400,
        )
      }

      await Effect.runPromise(githubService.deleteBranch(name))

      return c.json({ success: true }, 200)
    } catch (error) {
      const { statusCode, body } = errorToResponse(error)
      return c.json<ErrorResponse>(body, toStatusCode(statusCode))
    }
  })

  // ============================================================================
  // Commit Operations
  // ============================================================================

  // GET /commits - Get commit history
  app.get("/commits", async (c) => {
    try {
      const path = c.req.query("path")
      const branch = c.req.query("branch")
      const limitStr = c.req.query("limit")
      const limit = limitStr ? Number.parseInt(limitStr, 10) : undefined

      const commits = await Effect.runPromise(
        githubService.getCommitHistory(
          path ?? undefined,
          branch ?? undefined,
          limit,
        ),
      )

      return c.json<CommitsResponse>({ commits }, 200)
    } catch (error) {
      const { statusCode, body } = errorToResponse(error)
      return c.json<ErrorResponse>(body, toStatusCode(statusCode))
    }
  })

  // GET /commits/:sha - Get a specific commit
  app.get("/commits/:sha", async (c) => {
    try {
      const sha = c.req.param("sha")
      if (!sha) {
        return c.json<ErrorResponse>(
          { error: "BadRequest", message: "Missing commit sha" },
          400,
        )
      }

      const commit = await Effect.runPromise(githubService.getCommit(sha))

      return c.json(commit, 200)
    } catch (error) {
      const { statusCode, body } = errorToResponse(error)
      return c.json<ErrorResponse>(body, toStatusCode(statusCode))
    }
  })

  // GET /commits/:sha/diff - Get commit diff with file changes
  app.get("/commits/:sha/diff", async (c) => {
    try {
      const sha = c.req.param("sha")
      if (!sha) {
        return c.json<ErrorResponse>(
          { error: "BadRequest", message: "Missing commit sha" },
          400,
        )
      }

      const diff = await Effect.runPromise(githubService.getCommitDiff(sha))

      return c.json(diff, 200)
    } catch (error) {
      const { statusCode, body } = errorToResponse(error)
      return c.json<ErrorResponse>(body, toStatusCode(statusCode))
    }
  })

  // POST /commits - Create a new commit with multiple files
  app.post("/commits", async (c) => {
    try {
      const body = (await c.req.json()) as CreateCommitRequest

      if (!body.branch || typeof body.branch !== "string") {
        return c.json<ErrorResponse>(
          { error: "BadRequest", message: "Missing or invalid branch" },
          400,
        )
      }

      if (!body.message || typeof body.message !== "string") {
        return c.json<ErrorResponse>(
          { error: "BadRequest", message: "Missing or invalid commit message" },
          400,
        )
      }

      if (!Array.isArray(body.files) || body.files.length === 0) {
        return c.json<ErrorResponse>(
          { error: "BadRequest", message: "Missing or empty files array" },
          400,
        )
      }

      // Validate each file has path and content
      for (const file of body.files) {
        if (!file.path || typeof file.path !== "string") {
          return c.json<ErrorResponse>(
            { error: "BadRequest", message: "Each file must have a valid path" },
            400,
          )
        }
        if (typeof file.content !== "string") {
          return c.json<ErrorResponse>(
            { error: "BadRequest", message: `File ${file.path} must have content` },
            400,
          )
        }
      }

      const commit = await Effect.runPromise(
        githubService.createCommit(
          body.branch,
          body.message,
          body.files,
          body.author ?? undefined,
        ),
      )

      return c.json<FileCommitResponse>(
        {
          success: true,
          commit,
          branch: body.branch,
        },
        201,
      )
    } catch (error) {
      const { statusCode, body } = errorToResponse(error)
      return c.json<ErrorResponse>(body, toStatusCode(statusCode))
    }
  })

  // ============================================================================
  // Pull Request Operations
  // ============================================================================

  // POST /pr - Create a pull request
  app.post("/pr", async (c) => {
    try {
      const body = (await c.req.json()) as CreatePRRequest

      if (!body.head || typeof body.head !== "string") {
        return c.json<ErrorResponse>(
          { error: "BadRequest", message: "Missing or invalid head branch" },
          400,
        )
      }

      if (!body.title || typeof body.title !== "string") {
        return c.json<ErrorResponse>(
          { error: "BadRequest", message: "Missing or invalid PR title" },
          400,
        )
      }

      const base = body.base ?? GitHubConfig.defaultBranch

      const pr = await Effect.runPromise(
        githubService.createPR(body.head, base, body.title, body.body ?? undefined),
      )

      return c.json<PRResponse>({ pr, success: true }, 201)
    } catch (error) {
      const { statusCode, body } = errorToResponse(error)
      return c.json<ErrorResponse>(body, toStatusCode(statusCode))
    }
  })

  // GET /pr/:number - Get a pull request
  app.get("/pr/:number", async (c) => {
    try {
      const numberStr = c.req.param("number")
      if (!numberStr) {
        return c.json<ErrorResponse>(
          { error: "BadRequest", message: "Missing PR number" },
          400,
        )
      }

      const prNumber = Number.parseInt(numberStr, 10)
      if (Number.isNaN(prNumber)) {
        return c.json<ErrorResponse>(
          { error: "BadRequest", message: "Invalid PR number" },
          400,
        )
      }

      const pr = await Effect.runPromise(githubService.getPR(prNumber))

      return c.json(pr, 200)
    } catch (error) {
      const { statusCode, body } = errorToResponse(error)
      return c.json<ErrorResponse>(body, toStatusCode(statusCode))
    }
  })

  // ============================================================================
  // Validation Operations
  // ============================================================================

  // POST /validate - Validate content snippets
  app.post("/validate", async (c) => {
    if (!validationService) {
      return c.json<ErrorResponse>(
        { error: "NotConfigured", message: "Validation service is not available" },
        503,
      )
    }

    try {
      const body = (await c.req.json()) as ValidateRequest

      if (!Array.isArray(body.files) || body.files.length === 0) {
        return c.json<ErrorResponse>(
          { error: "BadRequest", message: "Missing or empty files array" },
          400,
        )
      }

      // Validate request format
      for (const file of body.files) {
        if (!file.path || typeof file.path !== "string") {
          return c.json<ErrorResponse>(
            { error: "BadRequest", message: "Each file must have a valid path" },
            400,
          )
        }
        if (typeof file.content !== "string") {
          return c.json<ErrorResponse>(
            { error: "BadRequest", message: `File ${file.path} must have content` },
            400,
          )
        }
        if (!file.toolPair || typeof file.toolPair !== "string") {
          return c.json<ErrorResponse>(
            { error: "BadRequest", message: `File ${file.path} must have a toolPair` },
            400,
          )
        }
      }

      const results = await Effect.runPromise(validationService.validateBatch(body.files))

      return c.json<ValidationResponse>({ results }, 200)
    } catch (error) {
      const { statusCode, body } = errorToResponse(error)
      return c.json<ErrorResponse>(body, toStatusCode(statusCode))
    }
  })

  // GET /validate/status - Check if validation is available
  app.get("/validate/status", async (c) => {
    if (!validationService) {
      return c.json({ available: false, reason: "Validation service not configured" }, 200)
    }

    try {
      const available = await Effect.runPromise(validationService.checkDockerAvailable())
      return c.json({
        available,
        reason: available ? null : "Docker is not available or missing required images",
      })
    } catch (error) {
      return c.json({
        available: false,
        reason: error instanceof Error ? error.message : "Unknown error",
      })
    }
  })

  return app
}
