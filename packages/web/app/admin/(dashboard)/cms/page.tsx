"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { Effect, pipe } from "effect"
import {
  FileBrowser,
  FileBrowserSkeleton,
  FileEditor,
  FileEditorSkeleton,
  MDXPreview,
  ValidationPanel,
  ValidationSummary,
  BranchSelector,
  PRDialog,
  CreateFileDialog,
} from "@/components/cms"
import type { FileEntry, FileBrowserFilters, EditorFile } from "@/components/cms"
import {
  CMSClient,
  CMSClientLive,
  type GitHubBranch,
  type SnippetValidationResult,
  type ContentFile,
} from "@/services/cms-client"

/**
 * CMS admin page state.
 */
interface CMSState {
  // File browser state
  readonly files: readonly ContentFile[]
  readonly filesLoading: boolean
  readonly filesError: string | null

  // Branch state
  readonly branches: readonly GitHubBranch[]
  readonly currentBranch: string
  readonly defaultBranch: string
  readonly branchesLoading: boolean
  readonly branchCreating: boolean
  readonly branchError: string | null

  // Editor state
  readonly openFiles: readonly EditorFile[]
  readonly activeFileIndex: number
  readonly selectedFilePath: string | null
  readonly fileLoading: boolean
  readonly fileSaving: boolean

  // Validation state
  readonly validationResults: readonly SnippetValidationResult[]
  readonly showValidationPanel: boolean
  readonly isValidating: boolean

  // PR state
  readonly showPRDialog: boolean
  readonly prCreating: boolean

  // Create file state
  readonly showCreateDialog: boolean

  // CMS availability
  readonly cmsAvailable: boolean
  readonly cmsError: string | null
}

/**
 * Initial CMS state.
 */
const initialState: CMSState = {
  files: [],
  filesLoading: true,
  filesError: null,

  branches: [],
  currentBranch: "main",
  defaultBranch: "main",
  branchesLoading: true,
  branchCreating: false,
  branchError: null,

  openFiles: [],
  activeFileIndex: 0,
  selectedFilePath: null,
  fileLoading: false,
  fileSaving: false,

  validationResults: [],
  showValidationPanel: false,
  isValidating: false,

  showPRDialog: false,
  prCreating: false,

  showCreateDialog: false,

  cmsAvailable: false,
  cmsError: null,
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
 * Convert ContentFile to FileEntry for FileBrowser.
 */
function toFileEntry(file: ContentFile): FileEntry {
  return {
    path: file.path,
    name: file.name,
    type: file.type,
    size: file.size,
    sha: file.sha,
  }
}

/**
 * Get tool pair from file path.
 * E.g., "content/comparisons/jj-git/01-step.mdx" -> "jj-git"
 */
function getToolPairFromPath(path: string): string {
  const parts = path.split("/")
  const comparisonsIndex = parts.indexOf("comparisons")
  const comparisonsPair = parts[comparisonsIndex + 1]
  if (comparisonsIndex >= 0 && comparisonsPair) {
    return comparisonsPair
  }
  // Check for katas
  const katasIndex = parts.indexOf("katas")
  const katasPair = parts[katasIndex + 1]
  if (katasIndex >= 0 && katasPair) {
    return katasPair
  }
  return "unknown"
}

/**
 * CMS Admin Page.
 *
 * Main CMS interface combining FileBrowser, FileEditor, and MDXPreview
 * with branch management and validation support.
 *
 * Features:
 * - Three-column layout (browser | editor | preview)
 * - File browsing with tree view
 * - Multi-file editing with tabs
 * - Live MDX preview
 * - Branch selection and creation
 * - Snippet validation
 * - Pull request creation
 *
 * Responsive: collapses preview on smaller screens.
 */
export default function CMSPage() {
  // CMS state
  const [state, setState] = useState<CMSState>(initialState)

  // File browser filters
  const [filters, setFilters] = useState<FileBrowserFilters>({
    search: "",
  })

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(
    () => state.openFiles.some((f) => f.dirty),
    [state.openFiles],
  )

  // Get active file content for preview
  const activeFileContent = useMemo(() => {
    const file = state.openFiles[state.activeFileIndex]
    return file?.content ?? ""
  }, [state.openFiles, state.activeFileIndex])

  // Check CMS status on mount
  useEffect(() => {
    async function checkStatus() {
      try {
        const client = await runCMSEffect(CMSClient)
        const status = await runCMSEffect(client.getStatus())

        setState((prev) => ({
          ...prev,
          cmsAvailable: status.available,
          defaultBranch: status.defaultBranch ?? "main",
          currentBranch: status.defaultBranch ?? "main",
          cmsError: status.available ? null : "CMS is not configured",
        }))

        if (status.available) {
          // Load branches and files
          loadBranches()
          loadFiles(status.defaultBranch ?? "main")
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to connect to CMS"
        setState((prev) => ({
          ...prev,
          cmsAvailable: false,
          cmsError: message,
          filesLoading: false,
          branchesLoading: false,
        }))
      }
    }

    checkStatus()
  }, [])

  // Load branches from API
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

  // Load files from API
  const loadFiles = useCallback(async (branch: string) => {
    setState((prev) => ({ ...prev, filesLoading: true, filesError: null }))

    try {
      const client = await runCMSEffect(CMSClient)
      const result = await runCMSEffect(client.listFiles({ branch }))

      setState((prev) => ({
        ...prev,
        files: result.files,
        filesLoading: false,
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load files"
      setState((prev) => ({
        ...prev,
        filesLoading: false,
        filesError: message,
      }))
    }
  }, [])

  // Handle branch selection
  const handleBranchSelect = useCallback(
    async (branchName: string) => {
      setState((prev) => ({ ...prev, currentBranch: branchName }))
      await loadFiles(branchName)
    },
    [loadFiles],
  )

  // Handle branch creation
  const handleBranchCreate = useCallback(
    async (name: string) => {
      setState((prev) => ({ ...prev, branchCreating: true, branchError: null }))

      try {
        const client = await runCMSEffect(CMSClient)
        await runCMSEffect(client.createBranch({ name, from: state.currentBranch }))

        // Reload branches and switch to new branch
        await loadBranches()
        setState((prev) => ({ ...prev, currentBranch: name, branchCreating: false }))
        await loadFiles(name)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create branch"
        setState((prev) => ({
          ...prev,
          branchCreating: false,
          branchError: message,
        }))
      }
    },
    [state.currentBranch, loadBranches, loadFiles],
  )

  // Handle file selection
  const handleFileSelect = useCallback(
    async (path: string) => {
      setState((prev) => ({ ...prev, selectedFilePath: path }))

      // Check if file is already open
      const existingIndex = state.openFiles.findIndex((f) => f.path === path)
      if (existingIndex >= 0) {
        setState((prev) => ({ ...prev, activeFileIndex: existingIndex }))
        return
      }

      // Check max tabs
      if (state.openFiles.length >= 10) {
        // TODO: Show toast notification about max tabs
        return
      }

      // Load file content
      setState((prev) => ({ ...prev, fileLoading: true }))

      try {
        const client = await runCMSEffect(CMSClient)
        const fileContent = await runCMSEffect(client.getFile(path, state.currentBranch))

        const newFile: EditorFile = {
          path: fileContent.path,
          content: fileContent.content,
          dirty: false,
          sha: fileContent.sha,
        }

        setState((prev) => ({
          ...prev,
          openFiles: [...prev.openFiles, newFile],
          activeFileIndex: prev.openFiles.length,
          fileLoading: false,
        }))
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load file"
        setState((prev) => ({
          ...prev,
          fileLoading: false,
          filesError: message,
        }))
      }
    },
    [state.openFiles, state.currentBranch],
  )

  // Handle file content change
  const handleContentChange = useCallback((index: number, content: string) => {
    setState((prev) => {
      const files = [...prev.openFiles]
      const file = files[index]
      if (!file) return prev

      files[index] = { ...file, content, dirty: true }
      return { ...prev, openFiles: files }
    })
  }, [])

  // Handle tab close
  const handleTabClose = useCallback((index: number) => {
    setState((prev) => {
      const files = [...prev.openFiles]
      files.splice(index, 1)

      let newActiveIndex = prev.activeFileIndex
      if (index <= prev.activeFileIndex && prev.activeFileIndex > 0) {
        newActiveIndex = prev.activeFileIndex - 1
      }
      if (newActiveIndex >= files.length) {
        newActiveIndex = Math.max(0, files.length - 1)
      }

      return {
        ...prev,
        openFiles: files,
        activeFileIndex: newActiveIndex,
        selectedFilePath: files[newActiveIndex]?.path ?? null,
      }
    })
  }, [])

  // Handle tab selection
  const handleTabSelect = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      activeFileIndex: index,
      selectedFilePath: prev.openFiles[index]?.path ?? null,
    }))
  }, [])

  // Handle save
  const handleSave = useCallback(async () => {
    const activeFile = state.openFiles[state.activeFileIndex]
    if (!activeFile?.dirty) return

    setState((prev) => ({ ...prev, fileSaving: true }))

    try {
      const client = await runCMSEffect(CMSClient)
      const result = await runCMSEffect(
        client.updateFile(activeFile.path, {
          content: activeFile.content,
          message: `Update ${activeFile.path.split("/").pop()}`,
          sha: activeFile.sha ?? "",
          branch: state.currentBranch,
        }),
      )

      // Update file with new SHA and clear dirty flag
      setState((prev) => {
        const files = [...prev.openFiles]
        const file = files[prev.activeFileIndex]
        if (file) {
          files[prev.activeFileIndex] = {
            ...file,
            dirty: false,
            sha: result.commit.sha,
          }
        }
        return { ...prev, openFiles: files, fileSaving: false }
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save file"
      setState((prev) => ({
        ...prev,
        fileSaving: false,
        filesError: message,
      }))
    }
  }, [state.openFiles, state.activeFileIndex, state.currentBranch])

  // Handle validation
  const handleValidate = useCallback(async () => {
    const activeFile = state.openFiles[state.activeFileIndex]
    if (!activeFile) return

    setState((prev) => ({ ...prev, isValidating: true, showValidationPanel: true }))

    try {
      const client = await runCMSEffect(CMSClient)
      const toolPair = getToolPairFromPath(activeFile.path)
      const result = await runCMSEffect(
        client.validateContent([
          { path: activeFile.path, content: activeFile.content, toolPair },
        ]),
      )

      setState((prev) => ({
        ...prev,
        validationResults: result.results,
        isValidating: false,
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : "Validation failed"
      setState((prev) => ({
        ...prev,
        isValidating: false,
        validationResults: [
          {
            file: activeFile.path,
            valid: false,
            errors: [{ line: 0, message, type: "runtime" }],
            duration: 0,
            timestamp: Date.now(),
          },
        ],
      }))
    }
  }, [state.openFiles, state.activeFileIndex])

  // Handle validation error click
  const handleValidationErrorClick = useCallback(
    (_file: string, _line: number) => {
      // TODO: Implement jumping to line in Monaco editor
      // This requires a ref to the Monaco editor instance
    },
    [],
  )

  // Handle PR creation
  const handleCreatePR = useCallback(
    async (title: string, body: string) => {
      setState((prev) => ({ ...prev, prCreating: true }))

      try {
        const client = await runCMSEffect(CMSClient)
        const result = await runCMSEffect(
          client.createPR({
            head: state.currentBranch,
            base: state.defaultBranch,
            title,
            body,
          }),
        )

        // Open PR in new tab
        window.open(result.pr.htmlUrl, "_blank")

        setState((prev) => ({
          ...prev,
          prCreating: false,
          showPRDialog: false,
        }))
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create PR"
        setState((prev) => ({
          ...prev,
          prCreating: false,
          branchError: message,
        }))
      }
    },
    [state.currentBranch, state.defaultBranch],
  )

  // Handle create file
  const handleCreateFile = useCallback(
    async (path: string, content: string) => {
      setState((prev) => ({ ...prev, fileLoading: true }))

      try {
        const client = await runCMSEffect(CMSClient)
        await runCMSEffect(
          client.createFile(path, {
            content,
            message: `Create ${path.split("/").pop()}`,
            branch: state.currentBranch,
          }),
        )

        // Reload files and open the new file
        await loadFiles(state.currentBranch)

        const newFile: EditorFile = {
          path,
          content,
          dirty: false,
        }

        setState((prev) => ({
          ...prev,
          openFiles: [...prev.openFiles, newFile],
          activeFileIndex: prev.openFiles.length,
          selectedFilePath: path,
          fileLoading: false,
          showCreateDialog: false,
        }))
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create file"
        setState((prev) => ({
          ...prev,
          fileLoading: false,
          filesError: message,
        }))
      }
    },
    [state.currentBranch, loadFiles],
  )

  // Convert files to FileEntry for FileBrowser
  const fileEntries = useMemo<readonly FileEntry[]>(
    () => state.files.map(toFileEntry),
    [state.files],
  )

  // CMS not available state
  if (!state.cmsAvailable && !state.filesLoading && !state.branchesLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <span className="text-4xl mb-4">!</span>
        <h1 className="text-lg font-mono font-semibold text-[var(--color-text)] mb-2">
          CMS Not Available
        </h1>
        <p className="text-sm font-mono text-[var(--color-text-muted)] text-center max-w-md mb-4">
          {state.cmsError ?? "The Content Management System is not configured."}
        </p>
        <p className="text-xs font-mono text-[var(--color-text-dim)] text-center max-w-md">
          Ensure GITHUB_TOKEN and GITHUB_REPO are set in the sandbox API configuration.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <h1 className="text-sm font-mono font-semibold text-[var(--color-text)]">
          Content CMS
        </h1>

        <div className="flex-1" />

        {/* Branch selector */}
        <BranchSelector
          branches={state.branches}
          selectedBranch={state.currentBranch}
          onSelect={handleBranchSelect}
          onCreate={handleBranchCreate}
          isLoading={state.branchesLoading}
          isCreating={state.branchCreating}
          hasUnsavedChanges={hasUnsavedChanges}
          defaultBranch={state.defaultBranch}
          {...(state.branchError !== null ? { error: state.branchError } : {})}
        />

        {/* Validation summary */}
        {state.validationResults.length > 0 && (
          <ValidationSummary
            results={state.validationResults}
            onClick={() => setState((prev) => ({ ...prev, showValidationPanel: true }))}
            isValidating={state.isValidating}
          />
        )}

        {/* Create file button */}
        <button
          type="button"
          onClick={() => setState((prev) => ({ ...prev, showCreateDialog: true }))}
          className="px-3 py-1.5 text-xs font-mono border border-[var(--color-border)] rounded text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
        >
          [+] New File
        </button>

        {/* Create PR button */}
        {state.currentBranch !== state.defaultBranch && (
          <button
            type="button"
            onClick={() => setState((prev) => ({ ...prev, showPRDialog: true }))}
            className="px-3 py-1.5 text-xs font-mono border border-[var(--color-accent)] rounded text-[var(--color-accent)] hover:bg-[var(--color-accent-bg)] transition-colors"
          >
            [PR] Create Pull Request
          </button>
        )}
      </div>

      {/* Main content - three column layout */}
      <div className="flex-1 flex min-h-0">
        {/* File browser (left column) */}
        <div className="w-64 flex-shrink-0 border-r border-[var(--color-border)] overflow-hidden">
          {state.filesLoading ? (
            <FileBrowserSkeleton />
          ) : (
            <FileBrowser
              files={fileEntries}
              selectedFile={state.selectedFilePath}
              onFileSelect={handleFileSelect}
              filters={filters}
              onFilterChange={setFilters}
              isLoading={state.fileLoading}
              onRetry={() => loadFiles(state.currentBranch)}
              {...(state.filesError !== null ? { error: state.filesError } : {})}
            />
          )}
        </div>

        {/* Editor (center column) */}
        <div className="flex-1 flex flex-col min-w-0">
          {state.fileLoading ? (
            <FileEditorSkeleton />
          ) : (
            <FileEditor
              files={state.openFiles}
              activeFileIndex={state.activeFileIndex}
              onContentChange={handleContentChange}
              onTabClose={handleTabClose}
              onTabSelect={handleTabSelect}
              onSave={handleSave}
              onValidate={handleValidate}
              isSaving={state.fileSaving}
              {...(state.validationResults[0] !== undefined ? { validationStatus: state.validationResults[0] } : {})}
            />
          )}

          {/* Validation panel (bottom of editor) */}
          {state.showValidationPanel && state.validationResults.length > 0 && (
            <ValidationPanel
              results={state.validationResults}
              onErrorClick={handleValidationErrorClick}
              onDismiss={() => setState((prev) => ({ ...prev, showValidationPanel: false }))}
              onRerun={handleValidate}
              isValidating={state.isValidating}
            />
          )}
        </div>

        {/* Preview (right column - hidden on small screens) */}
        <div className="hidden lg:block w-[400px] xl:w-[500px] flex-shrink-0 border-l border-[var(--color-border)]">
          <MDXPreview
            content={activeFileContent}
            debounceDelay={500}
          />
        </div>
      </div>

      {/* Create file dialog */}
      <CreateFileDialog
        isOpen={state.showCreateDialog}
        onClose={() => setState((prev) => ({ ...prev, showCreateDialog: false }))}
        onCreate={handleCreateFile}
        isLoading={state.fileLoading}
        toolPairings={[
          { slug: "jj-git", name: "jj (git)" },
          { slug: "zio-cats", name: "ZIO (Cats Effect)" },
          { slug: "effect-zio", name: "Effect (ZIO)" },
        ]}
      />

      {/* PR dialog */}
      <PRDialog
        isOpen={state.showPRDialog}
        onClose={() => setState((prev) => ({ ...prev, showPRDialog: false }))}
        branch={state.currentBranch}
        baseBranch={state.defaultBranch}
        onCreate={handleCreatePR}
        isLoading={state.prCreating}
        validationResults={state.validationResults}
        onValidate={handleValidate}
        isValidating={state.isValidating}
      />
    </div>
  )
}
