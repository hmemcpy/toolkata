import { Data, Effect } from "effect"

/**
 * GitHub configuration for Content CMS
 *
 * Centralized configuration for GitHub API integration.
 * Environment variables control authentication and repository targeting.
 */

/**
 * GitHub configuration
 *
 * @remarks
 * - `token`: GitHub personal access token for API authentication
 *   - Required for all GitHub API operations
 *   - Set via `GITHUB_TOKEN` env var
 *   - Token needs `repo` scope for read/write access to content repository
 * - `owner`: GitHub repository owner (user or organization)
 *   - Set via `GITHUB_OWNER` env var
 *   - Example: "toolkata"
 * - `repo`: GitHub repository name
 *   - Set via `GITHUB_REPO` env var
 *   - Example: "content"
 * - `defaultBranch`: Default branch name for the repository
 *   - Set via `GITHUB_DEFAULT_BRANCH` env var
 *   - Defaults to "main"
 *
 * @example
 * ```bash
 * # Required configuration
 * GITHUB_TOKEN=ghp_xxxxx
 * GITHUB_OWNER=toolkata
 * GITHUB_REPO=content
 *
 * # Optional (defaults to "main")
 * GITHUB_DEFAULT_BRANCH=main
 * ```
 */
export const GitHubConfig = {
  /**
   * GitHub personal access token
   * @default "" (CMS disabled without token)
   */
  token: (process.env["GITHUB_TOKEN"] ?? "") as string,

  /**
   * Repository owner (user or organization)
   * @default "" (must be configured)
   */
  owner: (process.env["GITHUB_OWNER"] ?? "") as string,

  /**
   * Repository name
   * @default "" (must be configured)
   */
  repo: (process.env["GITHUB_REPO"] ?? "") as string,

  /**
   * Default branch name
   * @default "main"
   */
  defaultBranch: (process.env["GITHUB_DEFAULT_BRANCH"] ?? "main") as string,
} as const

/**
 * TypeScript type for GitHub configuration
 */
export type GitHubConfigType = typeof GitHubConfig

/**
 * Check if GitHub CMS is enabled
 *
 * @returns true if all required GitHub configuration is set
 *
 * @remarks
 * CMS features require token, owner, and repo to be configured.
 * Without these, CMS endpoints should return 503 Service Unavailable.
 */
export const isGitHubConfigured = (): boolean => {
  return (
    GitHubConfig.token !== "" && GitHubConfig.owner !== "" && GitHubConfig.repo !== ""
  )
}

/**
 * GitHub configuration error type
 */
export class GitHubConfigError extends Data.TaggedClass("GitHubConfigError")<{
  readonly cause: "MissingToken" | "MissingOwner" | "MissingRepo" | "NotConfigured"
  readonly message: string
}> {}

/**
 * Validate GitHub configuration at startup
 *
 * @returns Validation result with optional error message
 *
 * @remarks
 * - Token is required for all operations
 * - Owner and repo must be set to target a repository
 * - Default branch has a sensible default ("main")
 * - Validation is only strict if CMS is being used
 */
export const validateGitHubConfig = (): {
  readonly valid: boolean
  readonly message?: string
  readonly warnings?: readonly string[]
} => {
  const warnings: string[] = []

  // If no token is set, CMS is just disabled (not an error)
  if (GitHubConfig.token === "") {
    return {
      valid: true,
      warnings: ["GITHUB_TOKEN not set - CMS features disabled"],
    }
  }

  // Token is set, so validate the rest
  if (GitHubConfig.owner === "") {
    return {
      valid: false,
      message: "GITHUB_OWNER is required when GITHUB_TOKEN is set",
    }
  }

  if (GitHubConfig.repo === "") {
    return {
      valid: false,
      message: "GITHUB_REPO is required when GITHUB_TOKEN is set",
    }
  }

  // Validate token format (basic check)
  const token = GitHubConfig.token
  if (!token.startsWith("ghp_") && !token.startsWith("github_pat_")) {
    warnings.push(
      "GITHUB_TOKEN does not appear to be a valid GitHub personal access token (expected prefix ghp_ or github_pat_)",
    )
  }

  if (warnings.length > 0) {
    return { valid: true, warnings }
  }
  return { valid: true }
}

/**
 * Require GitHub configuration for CMS operations
 *
 * @returns Effect that succeeds if GitHub is configured, fails otherwise
 *
 * @remarks
 * Use this in CMS route handlers to guard against missing configuration.
 * Returns a clear error message when CMS is not available.
 */
export const requireGitHubConfig = (): Effect.Effect<void, GitHubConfigError> => {
  if (GitHubConfig.token === "") {
    return Effect.fail(
      new GitHubConfigError({
        cause: "MissingToken",
        message: "GitHub CMS is not configured - GITHUB_TOKEN is required",
      }),
    )
  }

  if (GitHubConfig.owner === "") {
    return Effect.fail(
      new GitHubConfigError({
        cause: "MissingOwner",
        message: "GitHub CMS is not configured - GITHUB_OWNER is required",
      }),
    )
  }

  if (GitHubConfig.repo === "") {
    return Effect.fail(
      new GitHubConfigError({
        cause: "MissingRepo",
        message: "GitHub CMS is not configured - GITHUB_REPO is required",
      }),
    )
  }

  return Effect.void
}

/**
 * Get full repository identifier
 *
 * @returns Repository in "owner/repo" format, or empty string if not configured
 */
export const getRepoFullName = (): string => {
  if (!isGitHubConfigured()) {
    return ""
  }
  return `${GitHubConfig.owner}/${GitHubConfig.repo}`
}
