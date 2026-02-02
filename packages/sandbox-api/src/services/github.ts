import { Context, Data, Effect, Layer } from "effect"
import { Octokit } from "@octokit/rest"
import { GitHubConfig, type GitHubConfigError, requireGitHubConfig } from "../config/github.js"

/**
 * GitHub Service for Content CMS
 *
 * Provides Effect-TS wrapped GitHub API operations for content management.
 * All file operations go through the GitHub API (no local filesystem access).
 *
 * @see specs/content-cms.md for full specification
 */

// ============================================================================
// Error Types
// ============================================================================

export type GitHubErrorCause =
  | "NotFound"
  | "Unauthorized"
  | "RateLimited"
  | "ValidationFailed"
  | "ConflictError"
  | "NetworkError"
  | "UnknownError"

export class GitHubError extends Data.TaggedClass("GitHubError")<{
  readonly cause: GitHubErrorCause
  readonly message: string
  readonly status?: number
  readonly originalError?: unknown
}> {}

// ============================================================================
// Data Models (from specs/content-cms.md)
// ============================================================================

export interface ContentFile {
  readonly path: string
  readonly name: string
  readonly type: "file" | "dir"
  readonly size: number
  readonly sha: string
  readonly url: string
}

export interface ContentFolder {
  readonly path: string
  readonly name: string
  readonly type: "dir"
  readonly children: readonly (ContentFile | ContentFolder)[]
  readonly fileCount: number
}

export interface GitHubBranch {
  readonly name: string
  readonly sha: string
  readonly protected: boolean
}

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

export interface FileContent {
  readonly path: string
  readonly content: string
  readonly sha: string
  readonly encoding: "utf-8" | "base64"
}

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

export interface CommitFile {
  readonly path: string
  readonly content: string
}

export interface CommitAuthor {
  readonly name: string
  readonly email: string
}

export interface FileChange {
  readonly filename: string
  readonly status: "added" | "removed" | "modified" | "renamed"
  readonly additions: number
  readonly deletions: number
  readonly patch?: string
  readonly previousFilename?: string
}

export interface CommitDiff {
  readonly sha: string
  readonly files: readonly FileChange[]
  readonly additions: number
  readonly deletions: number
}

// ============================================================================
// Service Interface
// ============================================================================

export interface GitHubServiceShape {
  // Repository operations
  readonly getTree: (
    path?: string,
    branch?: string,
  ) => Effect.Effect<readonly ContentFile[], GitHubError | GitHubConfigError>

  readonly getFile: (
    path: string,
    branch?: string,
  ) => Effect.Effect<FileContent, GitHubError | GitHubConfigError>

  readonly createFile: (
    path: string,
    content: string,
    message: string,
    branch: string,
  ) => Effect.Effect<GitHubCommit, GitHubError | GitHubConfigError>

  readonly updateFile: (
    path: string,
    content: string,
    message: string,
    sha: string,
    branch: string,
  ) => Effect.Effect<GitHubCommit, GitHubError | GitHubConfigError>

  readonly deleteFile: (
    path: string,
    message: string,
    sha: string,
    branch: string,
  ) => Effect.Effect<GitHubCommit, GitHubError | GitHubConfigError>

  readonly renameFile: (
    oldPath: string,
    newPath: string,
    message: string,
    branch: string,
  ) => Effect.Effect<GitHubCommit, GitHubError | GitHubConfigError>

  // Branch operations
  readonly listBranches: () => Effect.Effect<
    readonly GitHubBranch[],
    GitHubError | GitHubConfigError
  >

  readonly createBranch: (
    name: string,
    fromRef?: string,
  ) => Effect.Effect<GitHubBranch, GitHubError | GitHubConfigError>

  readonly deleteBranch: (
    name: string,
  ) => Effect.Effect<void, GitHubError | GitHubConfigError>

  // Commit operations
  readonly getCommit: (
    sha: string,
  ) => Effect.Effect<GitHubCommit, GitHubError | GitHubConfigError>

  readonly getCommitDiff: (
    sha: string,
  ) => Effect.Effect<CommitDiff, GitHubError | GitHubConfigError>

  readonly getCommitHistory: (
    path?: string,
    branch?: string,
    limit?: number,
  ) => Effect.Effect<readonly GitHubCommit[], GitHubError | GitHubConfigError>

  readonly createCommit: (
    branch: string,
    message: string,
    files: readonly CommitFile[],
    author?: CommitAuthor,
  ) => Effect.Effect<GitHubCommit, GitHubError | GitHubConfigError>

  // PR operations
  readonly createPR: (
    head: string,
    base: string,
    title: string,
    body?: string,
  ) => Effect.Effect<GitHubPullRequest, GitHubError | GitHubConfigError>

  readonly getPR: (
    number: number,
  ) => Effect.Effect<GitHubPullRequest, GitHubError | GitHubConfigError>
}

// Service Tag
export class GitHubService extends Context.Tag("GitHubService")<
  GitHubService,
  GitHubServiceShape
>() {}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map Octokit errors to GitHubError
 */
const mapOctokitError = (error: unknown): GitHubError => {
  // Handle Octokit-specific errors
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status: number }).status
    const message =
      "message" in error ? String((error as { message: string }).message) : "Unknown error"

    if (status === 401 || status === 403) {
      return new GitHubError({
        cause: "Unauthorized",
        message: `GitHub API authentication failed: ${message}`,
        status,
        originalError: error,
      })
    }

    if (status === 404) {
      return new GitHubError({
        cause: "NotFound",
        message: `GitHub resource not found: ${message}`,
        status,
        originalError: error,
      })
    }

    if (status === 409) {
      return new GitHubError({
        cause: "ConflictError",
        message: `GitHub conflict: ${message}`,
        status,
        originalError: error,
      })
    }

    if (status === 422) {
      return new GitHubError({
        cause: "ValidationFailed",
        message: `GitHub validation failed: ${message}`,
        status,
        originalError: error,
      })
    }

    if (status === 429) {
      return new GitHubError({
        cause: "RateLimited",
        message: `GitHub API rate limit exceeded: ${message}`,
        status,
        originalError: error,
      })
    }

    return new GitHubError({
      cause: "UnknownError",
      message: `GitHub API error (${status}): ${message}`,
      status,
      originalError: error,
    })
  }

  // Network or other errors
  if (error instanceof Error) {
    return new GitHubError({
      cause: "NetworkError",
      message: `GitHub API request failed: ${error.message}`,
      originalError: error,
    })
  }

  return new GitHubError({
    cause: "UnknownError",
    message: `Unknown GitHub API error: ${String(error)}`,
    originalError: error,
  })
}

/**
 * Parse commit data from GitHub API response
 */
const parseCommit = (commit: {
  sha: string
  commit: {
    message: string
    author: { name?: string; email?: string; date?: string } | null
    committer: { name?: string; email?: string; date?: string } | null
  }
  parents?: Array<{ sha?: string; url?: string; html_url?: string }>
}): GitHubCommit => ({
  sha: commit.sha,
  shortSha: commit.sha.slice(0, 7),
  message: commit.commit.message,
  author: {
    name: commit.commit.author?.name ?? "Unknown",
    email: commit.commit.author?.email ?? "",
    date: commit.commit.author?.date ? new Date(commit.commit.author.date).getTime() : Date.now(),
  },
  committer: {
    name: commit.commit.committer?.name ?? "Unknown",
    email: commit.commit.committer?.email ?? "",
    date: commit.commit.committer?.date
      ? new Date(commit.commit.committer.date).getTime()
      : Date.now(),
  },
  parents: commit.parents?.map((p) => p.sha).filter((sha): sha is string => sha !== undefined) ?? [],
})

// ============================================================================
// Service Implementation
// ============================================================================

const make = Effect.gen(function* () {
  // Create Octokit instance with configured token
  const octokit = new Octokit({
    auth: GitHubConfig.token,
  })

  const { owner, repo, defaultBranch } = GitHubConfig

  // --------------------------------------------------------------------------
  // Repository Operations
  // --------------------------------------------------------------------------

  const getTree = (
    path?: string,
    branch?: string,
  ): Effect.Effect<readonly ContentFile[], GitHubError | GitHubConfigError> =>
    Effect.gen(function* () {
      yield* requireGitHubConfig()

      const ref = branch ?? defaultBranch

      // Get the commit SHA for the branch
      const branchResponse = yield* Effect.tryPromise({
        try: () =>
          octokit.repos.getBranch({
            owner,
            repo,
            branch: ref,
          }),
        catch: mapOctokitError,
      })

      const treeSha = branchResponse.data.commit.commit.tree.sha

      // Use Git Trees API with recursive mode to get all files
      const treeResponse = yield* Effect.tryPromise({
        try: () =>
          octokit.git.getTree({
            owner,
            repo,
            tree_sha: treeSha,
            recursive: "true",
          }),
        catch: mapOctokitError,
      })

      const items = treeResponse.data.tree

      // Filter by path prefix if specified
      const targetPath = path ?? ""
      const filteredItems = targetPath
        ? items.filter((item) => item.path?.startsWith(targetPath))
        : items

      // Map to ContentFile format
      return filteredItems
        .filter((item) => item.path && item.sha)
        .map((item) => ({
          path: item.path as string,
          name: (item.path as string).split("/").pop() ?? "",
          type: (item.type === "tree" ? "dir" : "file") as "file" | "dir",
          size: item.size ?? 0,
          sha: item.sha as string,
          url: "",
        })) as readonly ContentFile[]
    })

  const getFile = (
    path: string,
    branch?: string,
  ): Effect.Effect<FileContent, GitHubError | GitHubConfigError> =>
    Effect.gen(function* () {
      yield* requireGitHubConfig()

      const ref = branch ?? defaultBranch

      const response = yield* Effect.tryPromise({
        try: () =>
          octokit.repos.getContent({
            owner,
            repo,
            path,
            ref,
          }),
        catch: mapOctokitError,
      })

      const data = response.data

      // Ensure it's a file, not a directory
      if (Array.isArray(data) || data.type !== "file") {
        return yield* Effect.fail(
          new GitHubError({
            cause: "ValidationFailed",
            message: `Path is not a file: ${path}`,
          }),
        )
      }

      // Decode base64 content
      const content =
        "content" in data && data.content
          ? Buffer.from(data.content, "base64").toString("utf-8")
          : ""

      return {
        path: data.path,
        content,
        sha: data.sha,
        encoding: "utf-8" as const,
      }
    })

  const createFile = (
    path: string,
    content: string,
    message: string,
    branch: string,
  ): Effect.Effect<GitHubCommit, GitHubError | GitHubConfigError> =>
    Effect.gen(function* () {
      yield* requireGitHubConfig()

      const response = yield* Effect.tryPromise({
        try: () =>
          octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path,
            message,
            content: Buffer.from(content).toString("base64"),
            branch,
          }),
        catch: mapOctokitError,
      })

      const commitData = response.data.commit
      const commitInfo: Parameters<typeof parseCommit>[0] = {
        sha: commitData.sha ?? "",
        commit: {
          message: commitData.message ?? message,
          author: commitData.author ?? null,
          committer: commitData.committer ?? null,
        },
      }
      if (commitData.parents) {
        commitInfo.parents = commitData.parents
      }
      return parseCommit(commitInfo)
    })

  const updateFile = (
    path: string,
    content: string,
    message: string,
    sha: string,
    branch: string,
  ): Effect.Effect<GitHubCommit, GitHubError | GitHubConfigError> =>
    Effect.gen(function* () {
      yield* requireGitHubConfig()

      const response = yield* Effect.tryPromise({
        try: () =>
          octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path,
            message,
            content: Buffer.from(content).toString("base64"),
            sha,
            branch,
          }),
        catch: mapOctokitError,
      })

      const commitData = response.data.commit
      const commitInfo: Parameters<typeof parseCommit>[0] = {
        sha: commitData.sha ?? "",
        commit: {
          message: commitData.message ?? message,
          author: commitData.author ?? null,
          committer: commitData.committer ?? null,
        },
      }
      if (commitData.parents) {
        commitInfo.parents = commitData.parents
      }
      return parseCommit(commitInfo)
    })

  const deleteFile = (
    path: string,
    message: string,
    sha: string,
    branch: string,
  ): Effect.Effect<GitHubCommit, GitHubError | GitHubConfigError> =>
    Effect.gen(function* () {
      yield* requireGitHubConfig()

      const response = yield* Effect.tryPromise({
        try: () =>
          octokit.repos.deleteFile({
            owner,
            repo,
            path,
            message,
            sha,
            branch,
          }),
        catch: mapOctokitError,
      })

      const commitData = response.data.commit
      const commitInfo: Parameters<typeof parseCommit>[0] = {
        sha: commitData.sha ?? "",
        commit: {
          message: commitData.message ?? message,
          author: commitData.author ?? null,
          committer: commitData.committer ?? null,
        },
      }
      if (commitData.parents) {
        commitInfo.parents = commitData.parents
      }
      return parseCommit(commitInfo)
    })

  const renameFile = (
    oldPath: string,
    newPath: string,
    message: string,
    branch: string,
  ): Effect.Effect<GitHubCommit, GitHubError | GitHubConfigError> =>
    Effect.gen(function* () {
      yield* requireGitHubConfig()

      // First, get the file content from the old path
      const fileContent = yield* Effect.tryPromise({
        try: () =>
          octokit.repos.getContent({
            owner,
            repo,
            path: oldPath,
            ref: branch,
          }),
        catch: mapOctokitError,
      })

      // Ensure it's a file, not a directory
      if (Array.isArray(fileContent.data) || fileContent.data.type !== "file") {
        return yield* Effect.fail(
          new GitHubError({
            cause: "ValidationFailed",
            message: "Cannot rename: path is not a file",
            status: 422,
          }),
        )
      }

      const content = fileContent.data.content
        ? Buffer.from(fileContent.data.content, "base64").toString("utf-8")
        : ""

      // Get the current commit SHA for the branch
      const refResponse = yield* Effect.tryPromise({
        try: () =>
          octokit.git.getRef({
            owner,
            repo,
            ref: `heads/${branch}`,
          }),
        catch: mapOctokitError,
      })

      const currentCommitSha = refResponse.data.object.sha

      // Get the current tree
      const commitResponse = yield* Effect.tryPromise({
        try: () =>
          octokit.git.getCommit({
            owner,
            repo,
            commit_sha: currentCommitSha,
          }),
        catch: mapOctokitError,
      })

      const currentTreeSha = commitResponse.data.tree.sha

      // Create a blob for the new file
      const blobResponse = yield* Effect.tryPromise({
        try: () =>
          octokit.git.createBlob({
            owner,
            repo,
            content: Buffer.from(content).toString("base64"),
            encoding: "base64",
          }),
        catch: mapOctokitError,
      })

      // Create a new tree that:
      // 1. Adds the file at the new path
      // 2. Deletes the file at the old path (sha: null)
      const treeResponse = yield* Effect.tryPromise({
        try: () =>
          octokit.git.createTree({
            owner,
            repo,
            base_tree: currentTreeSha,
            tree: [
              // Add file at new path
              {
                path: newPath,
                mode: "100644",
                type: "blob",
                sha: blobResponse.data.sha,
              },
              // Delete file at old path
              {
                path: oldPath,
                mode: "100644",
                type: "blob",
                sha: null as unknown as string, // GitHub API accepts null to delete
              },
            ],
          }),
        catch: mapOctokitError,
      })

      // Create the commit
      const newCommitResponse = yield* Effect.tryPromise({
        try: () =>
          octokit.git.createCommit({
            owner,
            repo,
            message,
            tree: treeResponse.data.sha,
            parents: [currentCommitSha],
          }),
        catch: mapOctokitError,
      })

      // Update the branch reference
      yield* Effect.tryPromise({
        try: () =>
          octokit.git.updateRef({
            owner,
            repo,
            ref: `heads/${branch}`,
            sha: newCommitResponse.data.sha,
          }),
        catch: mapOctokitError,
      })

      return parseCommit({
        sha: newCommitResponse.data.sha,
        commit: {
          message: newCommitResponse.data.message,
          author: newCommitResponse.data.author,
          committer: newCommitResponse.data.committer,
        },
        parents: newCommitResponse.data.parents,
      })
    })

  // --------------------------------------------------------------------------
  // Branch Operations
  // --------------------------------------------------------------------------

  const listBranches = (): Effect.Effect<
    readonly GitHubBranch[],
    GitHubError | GitHubConfigError
  > =>
    Effect.gen(function* () {
      yield* requireGitHubConfig()

      const response = yield* Effect.tryPromise({
        try: () =>
          octokit.repos.listBranches({
            owner,
            repo,
            per_page: 100,
          }),
        catch: mapOctokitError,
      })

      return response.data.map((branch) => ({
        name: branch.name,
        sha: branch.commit.sha,
        protected: branch.protected,
      })) as readonly GitHubBranch[]
    })

  const createBranch = (
    name: string,
    fromRef?: string,
  ): Effect.Effect<GitHubBranch, GitHubError | GitHubConfigError> =>
    Effect.gen(function* () {
      yield* requireGitHubConfig()

      // Get the SHA of the source ref (default branch if not specified)
      const sourceRef = fromRef ?? defaultBranch
      const refResponse = yield* Effect.tryPromise({
        try: () =>
          octokit.git.getRef({
            owner,
            repo,
            ref: `heads/${sourceRef}`,
          }),
        catch: mapOctokitError,
      })

      const sourceSha = refResponse.data.object.sha

      // Create the new branch ref
      yield* Effect.tryPromise({
        try: () =>
          octokit.git.createRef({
            owner,
            repo,
            ref: `refs/heads/${name}`,
            sha: sourceSha,
          }),
        catch: mapOctokitError,
      })

      return {
        name,
        sha: sourceSha,
        protected: false,
      }
    })

  const deleteBranch = (
    name: string,
  ): Effect.Effect<void, GitHubError | GitHubConfigError> =>
    Effect.gen(function* () {
      yield* requireGitHubConfig()

      yield* Effect.tryPromise({
        try: () =>
          octokit.git.deleteRef({
            owner,
            repo,
            ref: `heads/${name}`,
          }),
        catch: mapOctokitError,
      })
    })

  // --------------------------------------------------------------------------
  // Commit Operations
  // --------------------------------------------------------------------------

  const getCommit = (
    sha: string,
  ): Effect.Effect<GitHubCommit, GitHubError | GitHubConfigError> =>
    Effect.gen(function* () {
      yield* requireGitHubConfig()

      const response = yield* Effect.tryPromise({
        try: () =>
          octokit.repos.getCommit({
            owner,
            repo,
            ref: sha,
          }),
        catch: mapOctokitError,
      })

      return parseCommit(response.data)
    })

  const getCommitDiff = (
    sha: string,
  ): Effect.Effect<CommitDiff, GitHubError | GitHubConfigError> =>
    Effect.gen(function* () {
      yield* requireGitHubConfig()

      const response = yield* Effect.tryPromise({
        try: () =>
          octokit.repos.getCommit({
            owner,
            repo,
            ref: sha,
          }),
        catch: mapOctokitError,
      })

      const files: FileChange[] = (response.data.files ?? []).map((file) => {
        let status: FileChange["status"] = "modified"
        if (file.status === "added") status = "added"
        else if (file.status === "removed") status = "removed"
        else if (file.status === "renamed") status = "renamed"

        const result: FileChange = {
          filename: file.filename,
          status,
          additions: file.additions,
          deletions: file.deletions,
        }

        // Only add optional properties if they exist
        if (file.patch !== undefined) {
          return { ...result, patch: file.patch }
        }
        if (file.previous_filename !== undefined) {
          return { ...result, previousFilename: file.previous_filename }
        }
        return result
      })

      return {
        sha: response.data.sha,
        files,
        additions: response.data.stats?.additions ?? 0,
        deletions: response.data.stats?.deletions ?? 0,
      }
    })

  const getCommitHistory = (
    path?: string,
    branch?: string,
    limit?: number,
  ): Effect.Effect<readonly GitHubCommit[], GitHubError | GitHubConfigError> =>
    Effect.gen(function* () {
      yield* requireGitHubConfig()

      const params: {
        owner: string
        repo: string
        sha?: string
        path?: string
        per_page?: number
      } = {
        owner,
        repo,
        per_page: limit ?? 20,
      }

      if (branch) {
        params.sha = branch
      }

      if (path) {
        params.path = path
      }

      const response = yield* Effect.tryPromise({
        try: () => octokit.repos.listCommits(params),
        catch: mapOctokitError,
      })

      return response.data.map(parseCommit) as readonly GitHubCommit[]
    })

  const createCommit = (
    branch: string,
    message: string,
    files: readonly CommitFile[],
    author?: CommitAuthor,
  ): Effect.Effect<GitHubCommit, GitHubError | GitHubConfigError> =>
    Effect.gen(function* () {
      yield* requireGitHubConfig()

      // Get the current commit SHA for the branch
      const refResponse = yield* Effect.tryPromise({
        try: () =>
          octokit.git.getRef({
            owner,
            repo,
            ref: `heads/${branch}`,
          }),
        catch: mapOctokitError,
      })

      const currentCommitSha = refResponse.data.object.sha

      // Get the current tree
      const commitResponse = yield* Effect.tryPromise({
        try: () =>
          octokit.git.getCommit({
            owner,
            repo,
            commit_sha: currentCommitSha,
          }),
        catch: mapOctokitError,
      })

      const currentTreeSha = commitResponse.data.tree.sha

      // Create blobs for each file
      const treeItems: Array<{
        path: string
        mode: "100644"
        type: "blob"
        sha: string
      }> = []

      for (const file of files) {
        const blobResponse = yield* Effect.tryPromise({
          try: () =>
            octokit.git.createBlob({
              owner,
              repo,
              content: Buffer.from(file.content).toString("base64"),
              encoding: "base64",
            }),
          catch: mapOctokitError,
        })

        treeItems.push({
          path: file.path,
          mode: "100644",
          type: "blob",
          sha: blobResponse.data.sha,
        })
      }

      // Create a new tree
      const treeResponse = yield* Effect.tryPromise({
        try: () =>
          octokit.git.createTree({
            owner,
            repo,
            base_tree: currentTreeSha,
            tree: treeItems,
          }),
        catch: mapOctokitError,
      })

      // Create the commit
      const commitParams: {
        owner: string
        repo: string
        message: string
        tree: string
        parents: string[]
        author?: { name: string; email: string }
      } = {
        owner,
        repo,
        message,
        tree: treeResponse.data.sha,
        parents: [currentCommitSha],
      }

      if (author) {
        commitParams.author = {
          name: author.name,
          email: author.email,
        }
      }

      const newCommitResponse = yield* Effect.tryPromise({
        try: () => octokit.git.createCommit(commitParams),
        catch: mapOctokitError,
      })

      // Update the branch reference
      yield* Effect.tryPromise({
        try: () =>
          octokit.git.updateRef({
            owner,
            repo,
            ref: `heads/${branch}`,
            sha: newCommitResponse.data.sha,
          }),
        catch: mapOctokitError,
      })

      return parseCommit({
        sha: newCommitResponse.data.sha,
        commit: {
          message: newCommitResponse.data.message,
          author: newCommitResponse.data.author,
          committer: newCommitResponse.data.committer,
        },
        parents: newCommitResponse.data.parents,
      })
    })

  // --------------------------------------------------------------------------
  // PR Operations
  // --------------------------------------------------------------------------

  const createPR = (
    head: string,
    base: string,
    title: string,
    body?: string,
  ): Effect.Effect<GitHubPullRequest, GitHubError | GitHubConfigError> =>
    Effect.gen(function* () {
      yield* requireGitHubConfig()

      const params: {
        owner: string
        repo: string
        title: string
        head: string
        base: string
        body?: string
      } = {
        owner,
        repo,
        title,
        head,
        base,
      }

      if (body) {
        params.body = body
      }

      const response = yield* Effect.tryPromise({
        try: () => octokit.pulls.create(params),
        catch: mapOctokitError,
      })

      const pr = response.data

      return {
        number: pr.number,
        title: pr.title,
        state: pr.state as "open" | "closed",
        htmlUrl: pr.html_url,
        head: {
          ref: pr.head.ref,
          sha: pr.head.sha,
        },
        base: {
          ref: pr.base.ref,
        },
        createdAt: new Date(pr.created_at).getTime(),
        updatedAt: new Date(pr.updated_at).getTime(),
      }
    })

  const getPR = (
    number: number,
  ): Effect.Effect<GitHubPullRequest, GitHubError | GitHubConfigError> =>
    Effect.gen(function* () {
      yield* requireGitHubConfig()

      const response = yield* Effect.tryPromise({
        try: () =>
          octokit.pulls.get({
            owner,
            repo,
            pull_number: number,
          }),
        catch: mapOctokitError,
      })

      const pr = response.data

      // Determine state (including merged)
      let state: "open" | "closed" | "merged" = pr.state as "open" | "closed"
      if (pr.merged) {
        state = "merged"
      }

      return {
        number: pr.number,
        title: pr.title,
        state,
        htmlUrl: pr.html_url,
        head: {
          ref: pr.head.ref,
          sha: pr.head.sha,
        },
        base: {
          ref: pr.base.ref,
        },
        createdAt: new Date(pr.created_at).getTime(),
        updatedAt: new Date(pr.updated_at).getTime(),
      }
    })

  // --------------------------------------------------------------------------
  // Return Service Shape
  // --------------------------------------------------------------------------

  return {
    getTree,
    getFile,
    createFile,
    updateFile,
    deleteFile,
    renameFile,
    listBranches,
    createBranch,
    deleteBranch,
    getCommit,
    getCommitDiff,
    getCommitHistory,
    createCommit,
    createPR,
    getPR,
  } satisfies GitHubServiceShape
})

// Live Layer
export const GitHubServiceLive = Layer.effect(GitHubService, make)
