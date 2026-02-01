"use client"

import { useState, useCallback, useEffect, useMemo, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Effect, pipe } from "effect"
import {
  HistoryPanel,
  HistoryPanelSkeleton,
  type GitDiff,
  type FileChange,
} from "@/components/cms/HistoryPanel"
import { BranchSelector } from "@/components/cms"
import {
  CMSClient,
  CMSClientLive,
  type GitHubBranch,
  type CommitDiff,
} from "@/services/cms-client"

/**
 * History page state.
 */
interface HistoryState {
  // CMS status
  readonly cmsAvailable: boolean
  readonly cmsError: string | null
  readonly defaultBranch: string

  // Branch state
  readonly branches: readonly GitHubBranch[]
  readonly currentBranch: string
  readonly branchesLoading: boolean
  readonly branchCreating: boolean
  readonly branchError: string | null

  // Commits state
  readonly commits: readonly import("@/services/cms-client").GitHubCommit[]
  readonly commitsLoading: boolean
  readonly commitsError: string | null

  // Selected commit diff
  readonly selectedCommitSha: string | null
  readonly diff: GitDiff | null
  readonly diffLoading: boolean
  readonly diffError: string | null
}

/**
 * Initial state.
 */
const initialState: HistoryState = {
  cmsAvailable: false,
  cmsError: null,
  defaultBranch: "main",

  branches: [],
  currentBranch: "main",
  branchesLoading: true,
  branchCreating: false,
  branchError: null,

  commits: [],
  commitsLoading: true,
  commitsError: null,

  selectedCommitSha: null,
  diff: null,
  diffLoading: false,
  diffError: null,
}

/**
 * Run an Effect with the CMS client.
 */
function runCMSEffect<A, E>(
  effect: Effect.Effect<A, E, CMSClient>,
): Promise<A> {
  return Effect.runPromise(
    pipe(effect, Effect.provide(CMSClientLive)),
  )
}

/**
 * Convert CommitDiff to GitDiff for HistoryPanel.
 */
function toGitDiff(commitDiff: CommitDiff): GitDiff {
  return {
    files: commitDiff.files.map((file): FileChange => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      ...(file.patch !== undefined && { patch: file.patch }),
      ...(file.previousFilename !== undefined && { previousFilename: file.previousFilename }),
    })),
    additions: commitDiff.additions,
    deletions: commitDiff.deletions,
  }
}

/**
 * CMS History Page wrapper with Suspense.
 */
export default function CMSHistoryPage() {
  return (
    <Suspense fallback={<HistoryPageLoading />}>
      <CMSHistoryContent />
    </Suspense>
  )
}

/**
 * Loading state for the history page.
 */
function HistoryPageLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <span className="text-xs font-mono text-[var(--color-text-muted)]">← back</span>
        <span className="text-[var(--color-text-dim)]">|</span>
        <span className="text-sm font-mono font-semibold text-[var(--color-text)]">
          Commit History
        </span>
      </div>
      <div className="flex-1 min-h-0">
        <HistoryPanelSkeleton />
      </div>
    </div>
  )
}

/**
 * CMS History Content.
 *
 * Shows commit history with diff viewer.
 *
 * Query Parameters:
 * - path: Optional file path to filter history by
 * - branch: Branch to show history for (defaults to default branch)
 *
 * Features:
 * - Commit list with author, date, message
 * - Diff viewer for selected commit
 * - File-level change list
 * - Copy commit hash
 * - Branch selector
 */
function CMSHistoryContent() {
  const searchParams = useSearchParams()
  const pathParam = searchParams.get("path")
  const branchParam = searchParams.get("branch")

  const [state, setState] = useState<HistoryState>(initialState)

  // Get display title
  const displayTitle = useMemo(() => {
    if (pathParam) {
      const filename = pathParam.split("/").pop() ?? pathParam
      return `History: ${filename}`
    }
    return "Commit History"
  }, [pathParam])

  // Load branches
  const loadBranches = useCallback(async () => {
    setState((prev) => ({ ...prev, branchesLoading: true, branchError: null }))

    try {
      const client = await runCMSEffect(CMSClient)
      const result = await runCMSEffect(client.listBranches())

      setState((prev) => ({
        ...prev,
        branches: result.branches,
        branchesLoading: false,
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load branches"
      setState((prev) => ({
        ...prev,
        branchesLoading: false,
        branchError: message,
      }))
    }
  }, [])

  // Load commits
  const loadCommits = useCallback(async (branch: string, path?: string) => {
    setState((prev) => ({ ...prev, commitsLoading: true, commitsError: null }))

    try {
      const client = await runCMSEffect(CMSClient)
      const params: { path?: string; branch?: string; limit?: number } = {
        branch,
        limit: 50,
      }
      if (path) {
        params.path = path
      }

      const result = await runCMSEffect(client.getCommitHistory(params))

      setState((prev) => ({
        ...prev,
        commits: result.commits,
        commitsLoading: false,
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load commits"
      setState((prev) => ({
        ...prev,
        commitsLoading: false,
        commitsError: message,
      }))
    }
  }, [])

  // Check CMS status and load data on mount
  useEffect(() => {
    async function init() {
      try {
        const client = await runCMSEffect(CMSClient)
        const status = await runCMSEffect(client.getStatus())

        const defaultBranch = status.defaultBranch ?? "main"
        const currentBranch = branchParam ?? defaultBranch

        setState((prev) => ({
          ...prev,
          cmsAvailable: status.available,
          defaultBranch,
          currentBranch,
          cmsError: status.available ? null : "CMS is not configured",
        }))

        if (status.available) {
          loadBranches()
          loadCommits(currentBranch, pathParam ?? undefined)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to connect to CMS"
        setState((prev) => ({
          ...prev,
          cmsAvailable: false,
          cmsError: message,
          branchesLoading: false,
          commitsLoading: false,
        }))
      }
    }

    init()
  }, [branchParam, pathParam, loadBranches, loadCommits])

  // Handle branch selection
  const handleBranchSelect = useCallback(
    async (branchName: string) => {
      setState((prev) => ({
        ...prev,
        currentBranch: branchName,
        selectedCommitSha: null,
        diff: null,
      }))
      await loadCommits(branchName, pathParam ?? undefined)
    },
    [loadCommits, pathParam],
  )

  // Handle branch creation
  const handleBranchCreate = useCallback(
    async (name: string) => {
      setState((prev) => ({ ...prev, branchCreating: true, branchError: null }))

      try {
        const client = await runCMSEffect(CMSClient)
        await runCMSEffect(client.createBranch({ name, from: state.currentBranch }))

        await loadBranches()
        setState((prev) => ({ ...prev, currentBranch: name, branchCreating: false }))
        await loadCommits(name, pathParam ?? undefined)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create branch"
        setState((prev) => ({
          ...prev,
          branchCreating: false,
          branchError: message,
        }))
      }
    },
    [state.currentBranch, loadBranches, loadCommits, pathParam],
  )

  // Handle commit selection
  const handleCommitSelect = useCallback(async (sha: string) => {
    setState((prev) => ({
      ...prev,
      selectedCommitSha: sha,
      diffLoading: true,
      diffError: null,
    }))

    try {
      const client = await runCMSEffect(CMSClient)
      const commitDiff = await runCMSEffect(client.getCommitDiff(sha))

      setState((prev) => ({
        ...prev,
        diff: toGitDiff(commitDiff),
        diffLoading: false,
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load diff"
      setState((prev) => ({
        ...prev,
        diffLoading: false,
        diffError: message,
      }))
    }
  }, [])

  // Handle error dismiss
  const handleErrorDismiss = useCallback(() => {
    setState((prev) => ({
      ...prev,
      commitsError: null,
      diffError: null,
    }))
  }, [])

  // CMS not available state
  if (!state.cmsAvailable && !state.commitsLoading && !state.branchesLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <span className="text-4xl mb-4">!</span>
        <h1 className="text-lg font-mono font-semibold text-[var(--color-text)] mb-2">
          CMS Not Available
        </h1>
        <p className="text-sm font-mono text-[var(--color-text-muted)] text-center max-w-md mb-4">
          {state.cmsError ?? "The Content Management System is not configured."}
        </p>
        <Link
          href="/admin/cms"
          className="text-sm font-mono text-[var(--color-accent)] hover:underline"
        >
          ← Back to CMS
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <Link
          href="/admin/cms"
          className="text-xs font-mono text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
        >
          ← back
        </Link>

        <span className="text-[var(--color-text-dim)]">|</span>

        <h1 className="text-sm font-mono font-semibold text-[var(--color-text)]">
          {displayTitle}
        </h1>

        {pathParam && (
          <span className="text-xs font-mono text-[var(--color-text-dim)] truncate max-w-md">
            {pathParam}
          </span>
        )}

        <div className="flex-1" />

        {/* Branch selector */}
        <BranchSelector
          branches={state.branches}
          selectedBranch={state.currentBranch}
          onSelect={handleBranchSelect}
          onCreate={handleBranchCreate}
          isLoading={state.branchesLoading}
          isCreating={state.branchCreating}
          defaultBranch={state.defaultBranch}
          {...(state.branchError !== null ? { error: state.branchError } : {})}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0">
        {state.commitsLoading ? (
          <HistoryPanelSkeleton />
        ) : (
          <HistoryPanel
            commits={state.commits}
            onCommitSelect={handleCommitSelect}
            isLoading={state.commitsLoading}
            isDiffLoading={state.diffLoading}
            onErrorDismiss={handleErrorDismiss}
            {...(state.selectedCommitSha !== null && { selectedCommitSha: state.selectedCommitSha })}
            {...(state.diff !== null && { diff: state.diff })}
            {...(state.commitsError !== null || state.diffError !== null
              ? { error: state.commitsError ?? state.diffError ?? "" }
              : {})}
          />
        )}
      </div>
    </div>
  )
}
