"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Editor, { type Monaco, type OnMount } from "@monaco-editor/react"
import { useDebouncedCallback } from "use-debounce"
import type { SnippetValidationResult } from "@/services/cms-client"

/**
 * File data for editor tabs.
 */
export interface EditorFile {
  readonly path: string
  readonly content: string
  readonly dirty: boolean
  readonly sha?: string
}

/**
 * FileEditor component props.
 */
interface FileEditorProps {
  /** List of open files */
  readonly files: readonly EditorFile[]
  /** Index of the currently active file */
  readonly activeFileIndex: number
  /** Callback when file content changes */
  readonly onContentChange: (index: number, content: string) => void
  /** Callback when a tab is closed */
  readonly onTabClose: (index: number) => void
  /** Callback when a tab is selected */
  readonly onTabSelect: (index: number) => void
  /** Callback to trigger save */
  readonly onSave: () => void
  /** Callback to trigger validation */
  readonly onValidate: () => void
  /** Current validation status */
  readonly validationStatus?: SnippetValidationResult
  /** Whether save is in progress */
  readonly isSaving?: boolean
  /** Auto-save delay in ms (0 to disable) */
  readonly autoSaveDelay?: number
}

/**
 * Maximum number of open tabs.
 */
const MAX_TABS = 10

/**
 * Get file extension from path.
 */
function getFileExtension(path: string): string {
  const parts = path.split(".")
  return parts.length > 1 ? (parts[parts.length - 1] ?? "") : ""
}

/**
 * Get Monaco language from file extension.
 */
function getMonacoLanguage(path: string): string {
  const ext = getFileExtension(path).toLowerCase()
  switch (ext) {
    case "mdx":
    case "md":
      return "markdown"
    case "yml":
    case "yaml":
      return "yaml"
    case "json":
      return "json"
    case "ts":
    case "tsx":
      return "typescript"
    case "js":
    case "jsx":
      return "javascript"
    case "css":
      return "css"
    case "html":
      return "html"
    default:
      return "plaintext"
  }
}

/**
 * Get file name from path.
 */
function getFileName(path: string): string {
  const parts = path.split("/")
  return parts[parts.length - 1] ?? path
}

/**
 * Get file icon based on extension.
 */
function getFileIcon(path: string): string {
  const ext = getFileExtension(path).toLowerCase()
  switch (ext) {
    case "mdx":
    case "md":
      return "📄"
    case "yml":
    case "yaml":
      return "⚙️"
    case "json":
      return "{ }"
    case "ts":
    case "tsx":
      return "🔷"
    case "js":
    case "jsx":
      return "🟨"
    default:
      return "📃"
  }
}

/**
 * FileEditor component.
 *
 * Monaco-based code editor with multi-file tab support for the Content CMS.
 *
 * Features:
 * - Tab bar with file names and close buttons
 * - Unsaved indicator (dirty state)
 * - Monaco editor with syntax highlighting for MDX, YAML, TypeScript
 * - Auto-save to localStorage (debounced)
 * - Keyboard shortcuts (Ctrl+S save, Ctrl+W close, Ctrl+Tab switch)
 *
 * Follows the terminal aesthetic design system.
 *
 * @example
 * ```tsx
 * <FileEditor
 *   files={openFiles}
 *   activeFileIndex={activeIndex}
 *   onContentChange={handleContentChange}
 *   onTabClose={handleTabClose}
 *   onTabSelect={handleTabSelect}
 *   onSave={handleSave}
 *   onValidate={handleValidate}
 * />
 * ```
 */
export function FileEditor(props: FileEditorProps) {
  const {
    files,
    activeFileIndex,
    onContentChange,
    onTabClose,
    onTabSelect,
    onSave,
    onValidate,
    validationStatus,
    isSaving,
    autoSaveDelay = 2000,
  } = props

  const editorRef = useRef<Parameters<OnMount>[0] | null>(null)
  const monacoRef = useRef<Monaco | null>(null)
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "pending" | "saved">("idle")

  // Get the active file
  const activeFile = files[activeFileIndex]

  // Auto-save debounced callback
  const debouncedAutoSave = useDebouncedCallback(() => {
    if (activeFile?.dirty) {
      setAutoSaveStatus("saved")
      // Save to localStorage
      const key = `cms_autosave_${activeFile.path}`
      try {
        localStorage.setItem(key, activeFile.content)
      } catch {
        // Ignore localStorage errors
      }
      // Reset status after a moment
      setTimeout(() => setAutoSaveStatus("idle"), 1500)
    }
  }, autoSaveDelay)

  // Handle editor mount
  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    // Configure Monaco theme to match terminal aesthetic
    monaco.editor.defineTheme("terminal-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "4a6b4a", fontStyle: "italic" },
        { token: "keyword", foreground: "39d96c" },
        { token: "string", foreground: "ffb000" },
        { token: "number", foreground: "8b5cf6" },
        { token: "type", foreground: "0066ff" },
      ],
      colors: {
        "editor.background": "#0a0a0a",
        "editor.foreground": "#d4e8d4",
        "editor.lineHighlightBackground": "#0f0f0f",
        "editor.selectionBackground": "#39d96c33",
        "editorCursor.foreground": "#39d96c",
        "editorLineNumber.foreground": "#4a6b4a",
        "editorLineNumber.activeForeground": "#7a9f7a",
        "editor.inactiveSelectionBackground": "#39d96c1a",
        "editorIndentGuide.background": "#1a1a1a",
        "editorIndentGuide.activeBackground": "#2a2a2a",
      },
    })
    monaco.editor.setTheme("terminal-dark")

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave()
    })

    // Ctrl+W to close tab (prevent browser default)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyW, () => {
      if (files.length > 0) {
        onTabClose(activeFileIndex)
      }
    })

    // Ctrl+Tab to switch to next tab
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Tab, () => {
      if (files.length > 1) {
        const nextIndex = (activeFileIndex + 1) % files.length
        onTabSelect(nextIndex)
      }
    })

    // Ctrl+Shift+Tab to switch to previous tab
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Tab,
      () => {
        if (files.length > 1) {
          const prevIndex = (activeFileIndex - 1 + files.length) % files.length
          onTabSelect(prevIndex)
        }
      },
    )
  }, [files.length, activeFileIndex, onSave, onTabClose, onTabSelect])

  // Handle content change
  const handleContentChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined && activeFile) {
        onContentChange(activeFileIndex, value)
        setAutoSaveStatus("pending")
        debouncedAutoSave()
      }
    },
    [activeFileIndex, activeFile, onContentChange, debouncedAutoSave],
  )

  // Handle tab close with middle click
  const handleTabMouseDown = useCallback(
    (e: React.MouseEvent, index: number) => {
      // Middle click
      if (e.button === 1) {
        e.preventDefault()
        onTabClose(index)
      }
    },
    [onTabClose],
  )

  // Focus editor when active file changes
  useEffect(() => {
    // activeFileIndex triggers this effect but we don't use it directly -
    // we just need to focus the editor when tabs change
    void activeFileIndex
    if (editorRef.current) {
      editorRef.current.focus()
    }
  }, [activeFileIndex])

  // No files open
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[var(--color-surface)] text-center p-8">
        <span className="text-4xl mb-4">📝</span>
        <p className="text-sm text-[var(--color-text-muted)] font-mono mb-2">
          No files open
        </p>
        <p className="text-xs text-[var(--color-text-dim)] font-mono">
          Select a file from the browser to start editing
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-surface)]">
      {/* Tab bar */}
      <div
        className="flex items-center gap-0.5 px-2 py-1 bg-[var(--color-bg)] border-b border-[var(--color-border)] overflow-x-auto"
        role="tablist"
        aria-label="Open files"
      >
        {files.map((file, index) => (
          <button
            key={file.path}
            type="button"
            role="tab"
            aria-selected={index === activeFileIndex}
            aria-controls={`editor-panel-${index}`}
            onClick={() => onTabSelect(index)}
            onMouseDown={(e) => handleTabMouseDown(e, index)}
            className={`group flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-t transition-colors whitespace-nowrap ${
              index === activeFileIndex
                ? "bg-[var(--color-surface)] text-[var(--color-text)] border-t border-l border-r border-[var(--color-border)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
            }`}
          >
            <span className="text-sm">{getFileIcon(file.path)}</span>
            <span className="max-w-[120px] truncate">{getFileName(file.path)}</span>
            {file.dirty && (
              <span
                className="w-2 h-2 rounded-full bg-[var(--color-accent)]"
                aria-label="Unsaved changes"
                title="Unsaved changes"
              />
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onTabClose(index)
              }}
              className="ml-1 p-0.5 rounded text-[var(--color-text-dim)] hover:text-[var(--color-error)] hover:bg-[var(--color-surface-hover)] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
              aria-label={`Close ${getFileName(file.path)}`}
            >
              ✕
            </button>
          </button>
        ))}
        {files.length >= MAX_TABS && (
          <span className="px-2 text-xs text-[var(--color-text-dim)] font-mono">
            ({MAX_TABS} max)
          </span>
        )}
      </div>

      {/* Editor toolbar */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
        {activeFile && (
          <span className="text-xs font-mono text-[var(--color-text-dim)] truncate flex-1">
            {activeFile.path}
          </span>
        )}

        {/* Auto-save indicator */}
        {autoSaveStatus === "pending" && (
          <span className="text-xs font-mono text-[var(--color-text-dim)]">
            Saving...
          </span>
        )}
        {autoSaveStatus === "saved" && (
          <span className="text-xs font-mono text-[var(--color-accent)]">
            Auto-saved
          </span>
        )}

        {/* Save button */}
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving || !activeFile?.dirty}
          className="px-3 py-1 text-xs font-mono border border-[var(--color-border)] rounded text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? "[...]" : "[Ctrl+S] Save"}
        </button>

        {/* Validate button */}
        <button
          type="button"
          onClick={onValidate}
          className="px-3 py-1 text-xs font-mono border border-[var(--color-border)] rounded text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
        >
          [↻] Validate
        </button>
      </div>

      {/* Validation status */}
      {validationStatus && (
        <div
          className={`px-3 py-1.5 text-xs font-mono border-b border-[var(--color-border)] ${
            validationStatus.valid
              ? "bg-[var(--color-accent-glow)] text-[var(--color-accent)]"
              : "bg-[rgba(255,65,54,0.1)] text-[var(--color-error)]"
          }`}
        >
          {validationStatus.valid ? (
            <span>✓ Validation passed ({validationStatus.duration}ms)</span>
          ) : (
            <span>
              ✕ {validationStatus.errors.length} error
              {validationStatus.errors.length !== 1 ? "s" : ""} found
            </span>
          )}
        </div>
      )}

      {/* Monaco editor */}
      <div className="flex-1 min-h-0" id={`editor-panel-${activeFileIndex}`}>
        {activeFile && (
          <Editor
            key={activeFile.path}
            height="100%"
            language={getMonacoLanguage(activeFile.path)}
            value={activeFile.content}
            onChange={handleContentChange}
            onMount={handleEditorMount}
            theme="terminal-dark"
            options={{
              fontFamily: "var(--font-mono), 'IBM Plex Mono', monospace",
              fontSize: 14,
              lineHeight: 1.6,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: "on",
              tabSize: 2,
              insertSpaces: true,
              renderWhitespace: "selection",
              cursorBlinking: "smooth",
              smoothScrolling: true,
              padding: { top: 16, bottom: 16 },
              folding: true,
              foldingStrategy: "indentation",
              showFoldingControls: "mouseover",
              bracketPairColorization: { enabled: true },
              guides: {
                indentation: true,
                bracketPairs: true,
              },
              suggest: {
                showWords: false,
              },
              quickSuggestions: {
                other: true,
                comments: false,
                strings: false,
              },
            }}
            loading={
              <div className="flex items-center justify-center h-full">
                <span className="text-sm font-mono text-[var(--color-text-dim)]">
                  Loading editor...
                </span>
              </div>
            }
          />
        )}
      </div>
    </div>
  )
}

/**
 * Static skeleton row data - stable keys with varying widths.
 */
const SKELETON_ROWS = [
  { id: "skeleton-0", width: "75%" },
  { id: "skeleton-1", width: "85%" },
  { id: "skeleton-2", width: "60%" },
  { id: "skeleton-3", width: "90%" },
  { id: "skeleton-4", width: "70%" },
  { id: "skeleton-5", width: "80%" },
  { id: "skeleton-6", width: "65%" },
  { id: "skeleton-7", width: "72%" },
  { id: "skeleton-8", width: "88%" },
  { id: "skeleton-9", width: "55%" },
  { id: "skeleton-10", width: "78%" },
  { id: "skeleton-11", width: "62%" },
  { id: "skeleton-12", width: "82%" },
  { id: "skeleton-13", width: "68%" },
  { id: "skeleton-14", width: "74%" },
] as const

/**
 * Skeleton loader for the file editor.
 */
export function FileEditorSkeleton() {
  return (
    <div className="flex flex-col h-full bg-[var(--color-surface)]">
      {/* Tab bar skeleton */}
      <div className="flex items-center gap-2 px-2 py-1 bg-[var(--color-bg)] border-b border-[var(--color-border)]">
        <div className="h-7 w-32 bg-[var(--color-border)] rounded animate-pulse" />
        <div className="h-7 w-28 bg-[var(--color-border)] rounded animate-pulse" />
      </div>

      {/* Toolbar skeleton */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
        <div className="h-4 flex-1 bg-[var(--color-border)] rounded animate-pulse" />
        <div className="h-6 w-20 bg-[var(--color-border)] rounded animate-pulse" />
        <div className="h-6 w-20 bg-[var(--color-border)] rounded animate-pulse" />
      </div>

      {/* Editor skeleton */}
      <div className="flex-1 p-4">
        <div className="space-y-2">
          {SKELETON_ROWS.map((row) => (
            <div
              key={row.id}
              className="h-4 bg-[var(--color-border)] rounded animate-pulse"
              style={{ width: row.width }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
