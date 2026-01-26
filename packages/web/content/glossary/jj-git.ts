/**
 * Glossary data module for jj ← git command reference.
 *
 * Shared data source for the glossary page.
 * Provides search, filtering, and category grouping capabilities.
 *
 * @module
 */

import type { GlossaryEntry as SharedGlossaryEntry } from "./types"

/**
 * Glossary category types for command groupings.
 */
export type GlossaryCategory =
  | "BASICS"
  | "COMMITS"
  | "HISTORY"
  | "BRANCHES"
  | "REMOTES"
  | "UNDO"
  | "CONFLICTS"
  | "ADVANCED"

/**
 * Single glossary entry for command mapping.
 *
 * Contains the source command, target command, optional note,
 * and category for grouping.
 */
export interface GlossaryEntry extends SharedGlossaryEntry {
  /** Category grouping for this entry */
  readonly category: GlossaryCategory
}

/**
 * Complete glossary data for jj ← git comparison.
 *
 * 35 command mappings organized by functional category with notes
 * for important differences.
 */
export const jjGitGlossary: readonly GlossaryEntry[] = [
  // BASICS
  {
    id: "basics-1",
    category: "BASICS",
    fromCommand: "git init",
    toCommand: "jj git init",
    note: "",
  },
  {
    id: "basics-2",
    category: "BASICS",
    fromCommand: "git clone <url>",
    toCommand: "jj git clone <url>",
    note: "",
  },
  {
    id: "basics-3",
    category: "BASICS",
    fromCommand: "git status",
    toCommand: "jj status (jj st)",
    note: "",
  },
  {
    id: "basics-4",
    category: "BASICS",
    fromCommand: "git log",
    toCommand: "jj log",
    note: "",
  },
  {
    id: "basics-5",
    category: "BASICS",
    fromCommand: "git diff",
    toCommand: "jj diff",
    note: "",
  },
  {
    id: "basics-6",
    category: "BASICS",
    fromCommand: "git diff --staged",
    toCommand: "jj diff --from @-",
    note: "No staging area in jj",
  },
  // COMMITS
  {
    id: "commits-1",
    category: "COMMITS",
    fromCommand: 'git add . && git commit -m "msg"',
    toCommand: 'jj describe -m "msg"',
    note: "Changes auto-tracked",
  },
  {
    id: "commits-2",
    category: "COMMITS",
    fromCommand: "git commit --amend",
    toCommand: "jj describe (on @)",
    note: "Edit working commit",
  },
  {
    id: "commits-3",
    category: "COMMITS",
    fromCommand: "(start new work)",
    toCommand: "jj new",
    note: "Creates new working commit",
  },
  {
    id: "commits-4",
    category: "COMMITS",
    fromCommand: "git checkout <commit>",
    toCommand: "jj new <commit>",
    note: "Create new commit at parent",
  },
  {
    id: "commits-5",
    category: "COMMITS",
    fromCommand: "git checkout <commit> (edit)",
    toCommand: "jj edit <commit>",
    note: "Make commit the working copy",
  },
  // HISTORY
  {
    id: "history-1",
    category: "HISTORY",
    fromCommand: "git rebase -i (fixup)",
    toCommand: "jj squash",
    note: "Squash into parent",
  },
  {
    id: "history-2",
    category: "HISTORY",
    fromCommand: "git rebase -i (split)",
    toCommand: "jj split",
    note: "Interactive split",
  },
  {
    id: "history-3",
    category: "HISTORY",
    fromCommand: "git rebase <onto>",
    toCommand: "jj rebase -d <onto>",
    note: "Descendants auto-rebase",
  },
  {
    id: "history-4",
    category: "HISTORY",
    fromCommand: "git cherry-pick <commit>",
    toCommand: "jj new <parent>; jj squash --from <source>",
    note: "Two-step process",
  },
  {
    id: "history-5",
    category: "HISTORY",
    fromCommand: "git show <commit>",
    toCommand: "jj show <commit>",
    note: "",
  },
  // BRANCHES → BOOKMARKS
  {
    id: "branches-1",
    category: "BRANCHES",
    fromCommand: "git branch <name>",
    toCommand: "jj bookmark create <name>",
    note: "jj uses bookmarks",
  },
  {
    id: "branches-2",
    category: "BRANCHES",
    fromCommand: "git checkout -b <name>",
    toCommand: "jj new; jj bookmark create <name>",
    note: "No current branch concept",
  },
  {
    id: "branches-3",
    category: "BRANCHES",
    fromCommand: "git branch -d <name>",
    toCommand: "jj bookmark delete <name>",
    note: "",
  },
  {
    id: "branches-4",
    category: "BRANCHES",
    fromCommand: "git branch -m <old> <new>",
    toCommand: "jj bookmark rename <old> <new>",
    note: "",
  },
  {
    id: "branches-5",
    category: "BRANCHES",
    fromCommand: "git branch",
    toCommand: "jj bookmark list",
    note: "",
  },
  // REMOTES
  {
    id: "remotes-1",
    category: "REMOTES",
    fromCommand: "git fetch",
    toCommand: "jj git fetch",
    note: "",
  },
  {
    id: "remotes-2",
    category: "REMOTES",
    fromCommand: "git push",
    toCommand: "jj git push",
    note: "Requires bookmark",
  },
  {
    id: "remotes-3",
    category: "REMOTES",
    fromCommand: "git push -u origin <branch>",
    toCommand: "jj git push -b <bookmark>",
    note: "jj requires bookmark name",
  },
  {
    id: "remotes-4",
    category: "REMOTES",
    fromCommand: "git pull",
    toCommand: "jj git fetch; jj rebase -d <bookmark>@origin",
    note: "No pull, use fetch+rebase",
  },
  // UNDO
  {
    id: "undo-1",
    category: "UNDO",
    fromCommand: "git reflog; git reset --hard",
    toCommand: "jj undo",
    note: "Undo last operation",
  },
  {
    id: "undo-2",
    category: "UNDO",
    fromCommand: "(see operation history)",
    toCommand: "jj op log",
    note: "View all operations",
  },
  {
    id: "undo-3",
    category: "UNDO",
    fromCommand: "git reset --hard <commit>",
    toCommand: "jj op restore <operation>",
    note: "Restore to any operation",
  },
  {
    id: "undo-4",
    category: "UNDO",
    fromCommand: "git revert <commit>",
    toCommand: 'jj new <commit>; jj new; jj describe -m "Revert"',
    note: "Manual revert process",
  },
  // CONFLICTS
  {
    id: "conflicts-1",
    category: "CONFLICTS",
    fromCommand: "git status (see conflicts)",
    toCommand: "jj status",
    note: "Conflicts stored in commit",
  },
  {
    id: "conflicts-2",
    category: "CONFLICTS",
    fromCommand: "git add <resolved>",
    toCommand: "jj resolve",
    note: "Mark conflict resolved",
  },
  {
    id: "conflicts-3",
    category: "CONFLICTS",
    fromCommand: "(view conflicts)",
    toCommand: "jj resolve --list",
    note: "List all conflicts",
  },
  // ADVANCED
  {
    id: "advanced-1",
    category: "ADVANCED",
    fromCommand: "git log --graph --oneline",
    toCommand: "jj log --graph",
    note: "",
  },
  {
    id: "advanced-2",
    category: "ADVANCED",
    fromCommand: "(find commits to rebase)",
    toCommand: "jj log -r 'main..@'",
    note: "Revset: commits since main",
  },
  {
    id: "advanced-3",
    category: "ADVANCED",
    fromCommand: "git describe",
    toCommand: "jj describe",
    note: "Show full change id",
  },
] as const

/**
 * Get all unique categories from glossary entries.
 *
 * Returns categories in a consistent order for UI display.
 *
 * @example
 * ```ts
 * import { getCategories } from "@/content/glossary/jj-git"
 *
 * const categories = getCategories()
 * // ["BASICS", "COMMITS", "HISTORY", "BRANCHES", "REMOTES", "UNDO", "CONFLICTS", "ADVANCED"]
 * ```
 */
export function getCategories(): readonly GlossaryCategory[] {
  const categoryOrder: readonly GlossaryCategory[] = [
    "BASICS",
    "COMMITS",
    "HISTORY",
    "BRANCHES",
    "REMOTES",
    "UNDO",
    "CONFLICTS",
    "ADVANCED",
  ]

  const categories = new Set<GlossaryCategory>()
  for (const entry of jjGitGlossary) {
    categories.add(entry.category)
  }

  // Return in defined order
  return categoryOrder.filter((cat) => categories.has(cat))
}

/**
 * Filter glossary entries by category.
 *
 * @param entries - The glossary entries to filter
 * @param category - The category to filter by
 * @returns Entries matching the specified category
 *
 * @example
 * ```ts
 * import { filterByCategory, jjGitGlossary } from "@/content/glossary/jj-git"
 *
 * const basics = filterByCategory(jjGitGlossary, "BASICS")
 * // Returns 6 entries from BASICS category
 * ```
 */
export function filterByCategory(
  entries: readonly GlossaryEntry[],
  category: GlossaryCategory,
): readonly GlossaryEntry[] {
  return entries.filter((entry) => entry.category === category)
}

/**
 * Search glossary entries by query string.
 *
 * Searches across fromCommand, toCommand, and note fields.
 * Case-insensitive partial matching.
 *
 * @param entries - The glossary entries to search
 * @param query - The search query string
 * @returns Entries matching the search query
 *
 * @example
 * ```ts
 * import { searchEntries, jjGitGlossary } from "@/content/glossary/jj-git"
 *
 * const results = searchEntries(jjGitGlossary, "commit")
 * // Returns entries containing "commit" in any field
 *
 * const empty = searchEntries(jjGitGlossary, "zzzzzzz")
 * // Returns empty array (no matches)
 * ```
 */
export function searchEntries(
  entries: readonly GlossaryEntry[],
  query: string,
): readonly GlossaryEntry[] {
  if (!query) {
    return entries
  }

  const lowerQuery = query.toLowerCase()

  return entries.filter(
    (entry) =>
      entry.fromCommand.toLowerCase().includes(lowerQuery) ||
      entry.toCommand.toLowerCase().includes(lowerQuery) ||
      entry.note.toLowerCase().includes(lowerQuery),
  )
}
