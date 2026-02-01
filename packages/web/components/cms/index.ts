/**
 * CMS Components
 *
 * UI components for the Content Management System admin section.
 * These components work with the cms-client service to provide:
 * - File browsing and selection
 * - MDX editing with Monaco
 * - Live preview
 * - Validation feedback
 * - GitHub branch/PR workflow
 *
 * @see specs/content-cms.md for full specification
 */

export { FileBrowser, FileBrowserSkeleton } from "./FileBrowser"
export type { FileEntry, FileBrowserFilters } from "./FileBrowser"

export { FileEditor, FileEditorSkeleton } from "./FileEditor"
export type { EditorFile } from "./FileEditor"

export { MDXPreview } from "./MDXPreview"

export { ValidationPanel, ValidationSummary } from "./ValidationPanel"

export { BranchSelector, BranchIndicator } from "./BranchSelector"

export { PRDialog } from "./PRDialog"

export { HistoryPanel, HistoryPanelSkeleton } from "./HistoryPanel"
export type { GitDiff, FileChange } from "./HistoryPanel"

export { CreateFileDialog } from "./CreateFileDialog"
export type { TemplateType } from "./CreateFileDialog"
