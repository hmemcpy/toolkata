"use client"

import { useState, useMemo, useCallback, useRef, useEffect } from "react"

/**
 * File entry from the CMS API.
 * Matches ContentFile from cms-client.ts.
 */
export interface FileEntry {
  readonly path: string
  readonly name: string
  readonly type: "file" | "dir"
  readonly size: number
  readonly sha: string
}

/**
 * Filter options for the file browser.
 */
export interface FileBrowserFilters {
  readonly type?: string
  readonly search?: string
}

/**
 * FileBrowser component props.
 */
interface FileBrowserProps {
  /** List of files from the CMS API */
  readonly files: readonly FileEntry[]
  /** Currently selected file path */
  readonly selectedFile: string | null
  /** Callback when a file is selected */
  readonly onFileSelect: (path: string) => void
  /** Callback when a file is renamed (oldPath, newPath) */
  readonly onFileRename?: (oldPath: string, newPath: string) => void
  /** Current filter settings */
  readonly filters: FileBrowserFilters
  /** Callback when filters change */
  readonly onFilterChange: (filters: FileBrowserFilters) => void
  /** Whether the file list is loading */
  readonly isLoading?: boolean
  /** Error message if loading failed */
  readonly error?: string
  /** Callback to retry loading */
  readonly onRetry?: () => void
}

/**
 * Tree node representing a file or directory in the hierarchy.
 */
interface TreeNode {
  readonly name: string
  readonly path: string
  readonly type: "file" | "dir"
  readonly size: number
  readonly sha: string
  readonly children: readonly TreeNode[]
  readonly depth: number
}

/**
 * Build a tree structure from a flat list of files.
 *
 * Files are organized by their path segments into a hierarchical tree.
 * Directories are sorted before files, then alphabetically.
 */
function buildFileTree(files: readonly FileEntry[]): readonly TreeNode[] {
  // Map of path -> node for quick lookups
  const nodeMap = new Map<string, TreeNode & { children: TreeNode[] }>()

  // Root nodes (top-level items)
  const roots: (TreeNode & { children: TreeNode[] })[] = []

  // Sort files so directories come first within each level
  const sortedFiles = [...files].sort((a, b) => {
    // Directories first
    if (a.type !== b.type) {
      return a.type === "dir" ? -1 : 1
    }
    // Then alphabetically
    return a.path.localeCompare(b.path)
  })

  for (const file of sortedFiles) {
    const segments = file.path.split("/")
    let currentPath = ""
    let parent: (TreeNode & { children: TreeNode[] }) | null = null

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      if (segment === undefined || segment === "") continue

      const prevPath = currentPath
      currentPath = currentPath ? `${currentPath}/${segment}` : segment
      const isLast = i === segments.length - 1

      let node = nodeMap.get(currentPath)
      if (!node) {
        node = {
          name: segment,
          path: currentPath,
          type: isLast ? file.type : "dir",
          size: isLast ? file.size : 0,
          sha: isLast ? file.sha : "",
          children: [],
          depth: currentPath.split("/").length - 1,
        }
        nodeMap.set(currentPath, node)

        if (parent) {
          parent.children.push(node)
        } else if (prevPath === "") {
          roots.push(node)
        }
      }

      parent = node
    }
  }

  // Sort children recursively
  function sortChildren(nodes: readonly TreeNode[]): readonly TreeNode[] {
    return [...nodes]
      .sort((a, b) => {
        // Directories first
        if (a.type !== b.type) {
          return a.type === "dir" ? -1 : 1
        }
        // Then alphabetically
        return a.name.localeCompare(b.name)
      })
      .map((node) => ({
        ...node,
        children: sortChildren(node.children),
      }))
  }

  return sortChildren(roots)
}

/**
 * Get file type icon based on file extension.
 */
function getFileIcon(name: string, type: "file" | "dir"): string {
  if (type === "dir") return "📁"

  const ext = name.split(".").pop()?.toLowerCase()
  switch (ext) {
    case "mdx":
    case "md":
      return "📄"
    case "yml":
    case "yaml":
      return "⚙️"
    case "json":
      return "{ }"
    case "tsx":
    case "ts":
      return "🔷"
    case "jsx":
    case "js":
      return "🟨"
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "svg":
      return "🖼️"
    default:
      return "📃"
  }
}

/**
 * Format file size for display.
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * TreeNodeItem - Individual node in the file tree.
 */
function TreeNodeItem(props: {
  node: TreeNode
  selectedFile: string | null
  expandedDirs: Set<string>
  onToggleExpand: (path: string) => void
  onFileSelect: (path: string) => void
  onFileRename?: (oldPath: string, newPath: string) => void
  renamingPath: string | null
  onStartRename: (path: string) => void
  onCancelRename: () => void
}) {
  const {
    node,
    selectedFile,
    expandedDirs,
    onToggleExpand,
    onFileSelect,
    onFileRename,
    renamingPath,
    onStartRename,
    onCancelRename,
  } = props
  const isExpanded = expandedDirs.has(node.path)
  const isSelected = selectedFile === node.path
  const isDir = node.type === "dir"
  const isRenaming = renamingPath === node.path

  // Rename input state
  const [renameValue, setRenameValue] = useState(node.name)
  const renameInputRef = useRef<HTMLInputElement>(null)

  // Focus input when entering rename mode
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus()
      // Select the filename without extension
      const dotIndex = node.name.lastIndexOf(".")
      const selectEnd = dotIndex > 0 ? dotIndex : node.name.length
      renameInputRef.current.setSelectionRange(0, selectEnd)
    }
  }, [isRenaming, node.name])

  // Reset rename value when path changes
  useEffect(() => {
    setRenameValue(node.name)
  }, [node.name])

  const handleClick = useCallback(() => {
    if (isRenaming) return
    if (isDir) {
      onToggleExpand(node.path)
    } else {
      onFileSelect(node.path)
    }
  }, [isDir, isRenaming, node.path, onToggleExpand, onFileSelect])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isRenaming) return
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        handleClick()
      }
      if (e.key === "F2" && !isDir && onFileRename) {
        e.preventDefault()
        onStartRename(node.path)
      }
      if (isDir && e.key === "ArrowRight" && !isExpanded) {
        e.preventDefault()
        onToggleExpand(node.path)
      }
      if (isDir && e.key === "ArrowLeft" && isExpanded) {
        e.preventDefault()
        onToggleExpand(node.path)
      }
    },
    [handleClick, isDir, isExpanded, isRenaming, node.path, onFileRename, onStartRename, onToggleExpand],
  )

  const handleRenameSubmit = useCallback(() => {
    const trimmedValue = renameValue.trim()
    if (!trimmedValue || trimmedValue === node.name) {
      onCancelRename()
      return
    }

    // Build new path with the new name
    const pathParts = node.path.split("/")
    pathParts[pathParts.length - 1] = trimmedValue
    const newPath = pathParts.join("/")

    onFileRename?.(node.path, newPath)
    onCancelRename()
  }, [renameValue, node.name, node.path, onFileRename, onCancelRename])

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault()
        handleRenameSubmit()
      }
      if (e.key === "Escape") {
        e.preventDefault()
        setRenameValue(node.name)
        onCancelRename()
      }
    },
    [handleRenameSubmit, node.name, onCancelRename],
  )

  const handleRenameBlur = useCallback(() => {
    handleRenameSubmit()
  }, [handleRenameSubmit])

  const handleRenameButtonClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onStartRename(node.path)
    },
    [node.path, onStartRename],
  )

  return (
    <div role="treeitem" aria-expanded={isDir ? isExpanded : undefined} aria-selected={isSelected}>
      <div
        className={`group w-full flex items-center gap-2 px-2 py-1.5 text-sm font-mono text-left transition-colors rounded ${
          isSelected
            ? "bg-[var(--color-accent-bg)] text-[var(--color-accent)]"
            : "text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
        }`}
        style={{ paddingLeft: `${node.depth * 16 + 8}px` }}
      >
        <button
          type="button"
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          className="flex items-center gap-2 flex-1 min-w-0 focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] rounded"
          tabIndex={0}
        >
          {isDir && (
            <span className="text-xs text-[var(--color-text-muted)] w-3 flex-shrink-0">
              {isExpanded ? "▼" : "▶"}
            </span>
          )}
          {!isDir && <span className="w-3 flex-shrink-0" />}
          <span className="text-sm flex-shrink-0">{getFileIcon(node.name, node.type)}</span>
          {isRenaming ? (
            <input
              ref={renameInputRef}
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={handleRenameKeyDown}
              onBlur={handleRenameBlur}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 min-w-0 px-1 py-0 text-sm font-mono bg-[var(--color-bg)] border border-[var(--color-accent)] rounded text-[var(--color-text)] focus-visible:outline-none"
              aria-label="New file name"
            />
          ) : (
            <span className="flex-1 truncate text-left">{node.name}</span>
          )}
        </button>
        {!isDir && !isRenaming && onFileRename && (
          <button
            type="button"
            onClick={handleRenameButtonClick}
            className="opacity-0 group-hover:opacity-100 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] rounded px-1"
            title="Rename (F2)"
            aria-label="Rename file"
          >
            ✎
          </button>
        )}
        {!isDir && node.size > 0 && !isRenaming && (
          <span className="text-xs text-[var(--color-text-dim)] flex-shrink-0">
            {formatFileSize(node.size)}
          </span>
        )}
      </div>

      {isDir && isExpanded && node.children.length > 0 && (
        <div role="group">
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.path}
              node={child}
              selectedFile={selectedFile}
              expandedDirs={expandedDirs}
              onToggleExpand={onToggleExpand}
              onFileSelect={onFileSelect}
              renamingPath={renamingPath}
              onStartRename={onStartRename}
              onCancelRename={onCancelRename}
              {...(onFileRename ? { onFileRename } : {})}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * FileBrowser component.
 *
 * Displays a tree view of files from the content repository with:
 * - Expandable folders
 * - File type icons (MDX, YAML, images)
 * - Search input for filtering
 * - File selection highlighting
 * - Keyboard navigation
 *
 * Follows the terminal aesthetic design system.
 *
 * @example
 * ```tsx
 * <FileBrowser
 *   files={files}
 *   selectedFile={selectedPath}
 *   onFileSelect={handleFileSelect}
 *   filters={{ search: "" }}
 *   onFilterChange={setFilters}
 * />
 * ```
 */
export function FileBrowser(props: FileBrowserProps) {
  const {
    files,
    selectedFile,
    onFileSelect,
    onFileRename,
    filters,
    onFilterChange,
    isLoading,
    error,
    onRetry,
  } = props

  // Track expanded directories
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())

  // Track file being renamed
  const [renamingPath, setRenamingPath] = useState<string | null>(null)

  // Handlers for rename mode
  const handleStartRename = useCallback((path: string) => {
    setRenamingPath(path)
  }, [])

  const handleCancelRename = useCallback(() => {
    setRenamingPath(null)
  }, [])

  // Filter files based on search
  const filteredFiles = useMemo(() => {
    if (!filters.search) return files

    const searchLower = filters.search.toLowerCase()
    return files.filter((file) => {
      const matchesName = file.name.toLowerCase().includes(searchLower)
      const matchesPath = file.path.toLowerCase().includes(searchLower)
      return matchesName || matchesPath
    })
  }, [files, filters.search])

  // Build tree from filtered files
  const tree = useMemo(() => buildFileTree(filteredFiles), [filteredFiles])

  // Toggle directory expansion
  const handleToggleExpand = useCallback((path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  // Expand all directories
  const handleExpandAll = useCallback(() => {
    const allDirs = files.filter((f) => f.type === "dir").map((f) => f.path)
    // Also add parent paths for nested files
    for (const file of files) {
      const segments = file.path.split("/")
      let path = ""
      for (let i = 0; i < segments.length - 1; i++) {
        const segment = segments[i]
        if (segment === undefined || segment === "") continue
        path = path ? `${path}/${segment}` : segment
        allDirs.push(path)
      }
    }
    setExpandedDirs(new Set(allDirs))
  }, [files])

  // Collapse all directories
  const handleCollapseAll = useCallback(() => {
    setExpandedDirs(new Set())
  }, [])

  // Handle search input change
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFilterChange({ ...filters, search: e.target.value })
    },
    [filters, onFilterChange],
  )

  // Clear search
  const handleClearSearch = useCallback(() => {
    onFilterChange({ ...filters, search: "" })
  }, [filters, onFilterChange])

  // Loading state
  if (isLoading) {
    return <FileBrowserSkeleton />
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <span className="text-4xl mb-4">⚠️</span>
        <p className="text-sm text-[var(--color-error)] font-mono mb-4">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-4 py-2 text-sm font-mono border border-[var(--color-border)] rounded text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)]"
          >
            [↻] Retry
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search and controls */}
      <div className="p-3 border-b border-[var(--color-border)] space-y-2">
        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            value={filters.search ?? ""}
            onChange={handleSearchChange}
            placeholder="Search files..."
            className="w-full px-3 py-2 pl-8 text-sm font-mono bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-[var(--color-text)] placeholder-[var(--color-text-dim)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] focus-visible:border-[var(--color-accent)]"
            aria-label="Search files"
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)] text-xs">
            🔍
          </span>
          {filters.search && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xs focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] rounded"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Expand/collapse controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExpandAll}
            className="text-xs font-mono text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] rounded px-1"
          >
            [+all]
          </button>
          <button
            type="button"
            onClick={handleCollapseAll}
            className="text-xs font-mono text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] rounded px-1"
          >
            [-all]
          </button>
          <span className="flex-1" />
          <span className="text-xs font-mono text-[var(--color-text-dim)]">
            {filteredFiles.length} files
          </span>
        </div>
      </div>

      {/* File tree */}
      <div className="flex-1 overflow-y-auto p-2" role="tree" aria-label="File browser">
        {tree.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <span className="text-2xl mb-2">📂</span>
            <p className="text-sm text-[var(--color-text-muted)] font-mono">
              {filters.search ? "No files match your search" : "No files found"}
            </p>
          </div>
        ) : (
          tree.map((node) => (
            <TreeNodeItem
              key={node.path}
              node={node}
              selectedFile={selectedFile}
              expandedDirs={expandedDirs}
              onToggleExpand={handleToggleExpand}
              onFileSelect={onFileSelect}
              renamingPath={renamingPath}
              onStartRename={handleStartRename}
              onCancelRename={handleCancelRename}
              {...(onFileRename ? { onFileRename } : {})}
            />
          ))
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
] as const

/**
 * Skeleton loader for the file browser.
 */
export function FileBrowserSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Search skeleton */}
      <div className="p-3 border-b border-[var(--color-border)] space-y-2">
        <div className="h-10 bg-[var(--color-border)] rounded animate-pulse" />
        <div className="flex items-center gap-2">
          <div className="h-4 w-12 bg-[var(--color-border)] rounded animate-pulse" />
          <div className="h-4 w-12 bg-[var(--color-border)] rounded animate-pulse" />
        </div>
      </div>

      {/* Tree skeleton */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {SKELETON_ROWS.map((row) => (
          <div key={row.id} className="flex items-center gap-2 px-2 py-1.5">
            <div className="h-4 w-4 bg-[var(--color-border)] rounded animate-pulse" />
            <div
              className="h-4 bg-[var(--color-border)] rounded animate-pulse"
              style={{ width: row.width }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
