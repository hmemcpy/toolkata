/**
 * Cheat sheet data for tmux terminal multiplexer.
 *
 * Single-tool command reference (not a comparison).
 * Provides search, filtering, and category grouping capabilities.
 *
 * @module
 */

import type { CheatSheetEntry as SharedCheatSheetEntry } from "./types"

/**
 * Cheat sheet category types for tmux command groupings.
 */
export type CheatSheetCategory =
  | "SESSIONS"
  | "WINDOWS"
  | "PANES"
  | "NAVIGATION"
  | "COPY_MODE"
  | "CONFIG"

/**
 * Single cheat sheet entry for tmux commands.
 *
 * Contains the command, description, optional note,
 * and category for grouping.
 */
export interface CheatSheetEntry extends SharedCheatSheetEntry {
  /** Category grouping for this entry */
  readonly category: CheatSheetCategory
}

/**
 * Complete cheat sheet data for tmux.
 *
 * Command reference organized by functional category with notes
 * for important usage details.
 */
export const tmuxCheatSheet: readonly CheatSheetEntry[] = [
  // SESSIONS
  {
    id: "sessions-1",
    category: "SESSIONS",
    command: "tmux new -s <name>",
    description: "Create a new named session",
    note: "",
  },
  {
    id: "sessions-2",
    category: "SESSIONS",
    command: "tmux ls",
    description: "List all sessions",
    note: "Or: tmux list-sessions",
  },
  {
    id: "sessions-3",
    category: "SESSIONS",
    command: "tmux attach -t <name>",
    description: "Attach to an existing session",
    note: "Or: tmux attach-session -t <name>",
  },
  {
    id: "sessions-4",
    category: "SESSIONS",
    command: "Ctrl+b d",
    description: "Detach from current session",
    note: "Session continues running in background",
  },
  {
    id: "sessions-5",
    category: "SESSIONS",
    command: "tmux kill-session -t <name>",
    description: "Kill a specific session",
    note: "",
  },
  {
    id: "sessions-6",
    category: "SESSIONS",
    command: "Ctrl+b $",
    description: "Rename current session",
    note: "Prompt appears at bottom",
  },
  {
    id: "sessions-7",
    category: "SESSIONS",
    command: "Ctrl+b s",
    description: "Show all sessions (interactive)",
    note: "Navigate and press Enter to attach",
  },
  // WINDOWS
  {
    id: "windows-1",
    category: "WINDOWS",
    command: "Ctrl+b c",
    description: "Create a new window",
    note: "Windows are numbered starting at 0",
  },
  {
    id: "windows-2",
    category: "WINDOWS",
    command: "Ctrl+b ,",
    description: "Rename current window",
    note: "",
  },
  {
    id: "windows-3",
    category: "WINDOWS",
    command: "Ctrl+b n",
    description: "Switch to next window",
    note: "",
  },
  {
    id: "windows-4",
    category: "WINDOWS",
    command: "Ctrl+b p",
    description: "Switch to previous window",
    note: "",
  },
  {
    id: "windows-5",
    category: "WINDOWS",
    command: "Ctrl+b 0-9",
    description: "Switch to window by number",
    note: "",
  },
  {
    id: "windows-6",
    category: "WINDOWS",
    command: "Ctrl+b w",
    description: "List all windows (interactive)",
    note: "",
  },
  {
    id: "windows-7",
    category: "WINDOWS",
    command: "Ctrl+b &",
    description: "Kill current window",
    note: "Confirms before killing",
  },
  {
    id: "windows-8",
    category: "WINDOWS",
    command: "Ctrl+b f",
    description: "Find window by name",
    note: "Search prompt appears",
  },
  // PANES
  {
    id: "panes-1",
    category: "PANES",
    command: "Ctrl+b %",
    description: "Split pane vertically (left/right)",
    note: "",
  },
  {
    id: "panes-2",
    category: "PANES",
    command: "Ctrl+b \"",
    description: "Split pane horizontally (top/bottom)",
    note: "",
  },
  {
    id: "panes-3",
    category: "PANES",
    command: "Ctrl+b o",
    description: "Cycle to next pane",
    note: "",
  },
  {
    id: "panes-4",
    category: "PANES",
    command: "Ctrl+b arrow keys",
    description: "Navigate to pane in direction",
    note: "Up, Down, Left, Right",
  },
  {
    id: "panes-5",
    category: "PANES",
    command: "Ctrl+b q",
    description: "Show pane numbers (短暂显示)",
    note: "Press number to jump to pane",
  },
  {
    id: "panes-6",
    category: "PANES",
    command: "Ctrl+b z",
    description: "Toggle zoom current pane",
    note: "Expand to fill window, toggle back",
  },
  {
    id: "panes-7",
    category: "PANES",
    command: "Ctrl+b {",
    description: "Move pane left (swap)",
    note: "",
  },
  {
    id: "panes-8",
    category: "PANES",
    command: "Ctrl+b }",
    description: "Move pane right (swap)",
    note: "",
  },
  {
    id: "panes-9",
    category: "PANES",
    command: "Ctrl+b x",
    description: "Kill current pane",
    note: "Confirms before killing",
  },
  {
    id: "panes-10",
    category: "PANES",
    command: "Ctrl+b Ctrl+arrow",
    description: "Resize pane in direction",
    note: "Hold Ctrl and press arrow repeatedly",
  },
  // NAVIGATION
  {
    id: "nav-1",
    category: "NAVIGATION",
    command: "Ctrl+b [",
    description: "Enter scroll mode (copy mode)",
    note: "Use arrows or vi keys to scroll",
  },
  {
    id: "nav-2",
    category: "NAVIGATION",
    command: "Ctrl+b page up/down",
    description: "Scroll terminal output",
    note: "Without entering copy mode",
  },
  {
    id: "nav-3",
    category: "NAVIGATION",
    command: "q or Esc",
    description: "Exit copy mode",
    note: "",
  },
  {
    id: "nav-4",
    category: "NAVIGATION",
    command: "Ctrl+b :",
    description: "Enter command mode",
    note: "Type commands at prompt",
  },
  {
    id: "nav-5",
    category: "NAVIGATION",
    command: "Ctrl+b ?",
    description: "List all key bindings",
    note: "Press q to exit list",
  },
  // COPY MODE
  {
    id: "copy-1",
    category: "COPY_MODE",
    command: "Ctrl+b [",
    description: "Enter copy mode",
    note: "",
  },
  {
    id: "copy-2",
    category: "COPY_MODE",
    command: "Space (start selection)",
    description: "Begin text selection",
    note: "Starts copy mode selection",
  },
  {
    id: "copy-3",
    category: "COPY_MODE",
    command: "Enter (copy selection)",
    description: "Copy selected text",
    note: "Also: Ctrl+w or y depending on mode",
  },
  {
    id: "copy-4",
    category: "COPY_MODE",
    command: "Ctrl+b ]",
    description: "Paste copied text",
    note: "Paste buffer to current pane",
  },
  {
    id: "copy-5",
    category: "COPY_MODE",
    command: "/ (in copy mode)",
    description: "Search forward",
    note: "Search prompt appears",
  },
  {
    id: "copy-6",
    category: "COPY_MODE",
    command: "? (in copy mode)",
    description: "Search backward",
    note: "",
  },
  {
    id: "copy-7",
    category: "COPY_MODE",
    command: "n (in copy mode)",
    description: "Repeat search in same direction",
    note: "",
  },
  {
    id: "copy-8",
    category: "COPY_MODE",
    command: "N (in copy mode)",
    description: "Repeat search in opposite direction",
    note: "",
  },
  // CONFIG
  {
    id: "config-1",
    category: "CONFIG",
    command: "~/.tmux.conf",
    description: "Configuration file location",
    note: "Create if doesn't exist",
  },
  {
    id: "config-2",
    category: "CONFIG",
    command: "set -g prefix C-a",
    description: "Change prefix key to Ctrl+a",
    note: "Add to .tmux.conf, then: source ~/.tmux.conf",
  },
  {
    id: "config-3",
    category: "CONFIG",
    command: "set -g mouse on",
    description: "Enable mouse support",
    note: "Click to select panes, drag to resize",
  },
  {
    id: "config-4",
    category: "CONFIG",
    command: "set -g status-bg colour",
    description: "Set status bar background color",
    note: "Colours: black, red, green, yellow, blue, magenta, cyan, white",
  },
  {
    id: "config-5",
    category: "CONFIG",
    command: "bind r source-file ~/.tmux.conf \\; display 'Reloaded!'",
    description: "Reload config with Ctrl+b r",
    note: "Add to .tmux.conf for quick reload",
  },
  {
    id: "config-6",
    category: "CONFIG",
    command: "set -g base-index 1",
    description: "Start windows/panes at 1 instead of 0",
    note: "Makes keyboard shortcuts more ergonomic",
  },
  {
    id: "config-7",
    category: "CONFIG",
    command: "set -g status-keys vi",
    description: "Use vi key bindings in command mode",
    note: "",
  },
  {
    id: "config-8",
    category: "CONFIG",
    command: "setw -g mode-keys vi",
    description: "Use vi keys in copy mode",
    note: "Default is emacs",
  },
] as const

/**
 * Get all unique categories from cheat sheet entries.
 *
 * Returns categories in a consistent order for UI display.
 *
 * @example
 * ```ts
 * import { getCategories } from "@/content/glossary/tmux"
 *
 * const categories = getCategories()
 * // ["SESSIONS", "WINDOWS", "PANES", "NAVIGATION", "COPY_MODE", "CONFIG"]
 * ```
 */
export function getCategories(): readonly CheatSheetCategory[] {
  const categoryOrder: readonly CheatSheetCategory[] = [
    "SESSIONS",
    "WINDOWS",
    "PANES",
    "NAVIGATION",
    "COPY_MODE",
    "CONFIG",
  ]

  const categories = new Set<CheatSheetCategory>()
  for (const entry of tmuxCheatSheet) {
    categories.add(entry.category)
  }

  // Return in defined order
  return categoryOrder.filter((cat) => categories.has(cat))
}

/**
 * Filter cheat sheet entries by category.
 *
 * @param entries - The cheat sheet entries to filter
 * @param category - The category to filter by
 * @returns Entries matching the specified category
 *
 * @example
 * ```ts
 * import { filterByCategory, tmuxCheatSheet } from "@/content/glossary/tmux"
 *
 * const sessions = filterByCategory(tmuxCheatSheet, "SESSIONS")
 * // Returns 7 entries from SESSIONS category
 * ```
 */
export function filterByCategory(
  entries: readonly CheatSheetEntry[],
  category: CheatSheetCategory,
): readonly CheatSheetEntry[] {
  return entries.filter((entry) => entry.category === category)
}

/**
 * Search cheat sheet entries by query string.
 *
 * Searches across command, description, and note fields.
 * Case-insensitive partial matching.
 *
 * @param entries - The cheat sheet entries to search
 * @param query - The search query string
 * @returns Entries matching the search query
 *
 * @example
 * ```ts
 * import { searchEntries, tmuxCheatSheet } from "@/content/glossary/tmux"
 *
 * const results = searchEntries(tmuxCheatSheet, "session")
 * // Returns entries containing "session" in any field
 *
 * const empty = searchEntries(tmuxCheatSheet, "zzzzzzz")
 * // Returns empty array (no matches)
 * ```
 */
export function searchEntries(
  entries: readonly CheatSheetEntry[],
  query: string,
): readonly CheatSheetEntry[] {
  if (!query) {
    return entries
  }

  const lowerQuery = query.toLowerCase()

  return entries.filter(
    (entry) =>
      entry.command.toLowerCase().includes(lowerQuery) ||
      entry.description.toLowerCase().includes(lowerQuery) ||
      (entry.note && entry.note.toLowerCase().includes(lowerQuery)),
  )
}
