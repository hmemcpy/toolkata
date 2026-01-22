"use client"

import Link from "next/link"
import { notFound } from "next/navigation"
import React from "react"
import type { JSX } from "react"
import { Footer } from "../../../components/ui/Footer"
import { Header } from "../../../components/ui/Header"
import { getPairing, isValidPairingSlug } from "../../../content/pairings"

/**
 * Command mapping for the cheat sheet.
 *
 * Each entry contains:
 * - category: The section header (e.g., "BASICS", "COMMITS")
 * - gitCommand: The git command that users know
 * - jjCommand: The equivalent jj command
 * - note: Optional note about differences (empty string if none)
 */
interface CheatSheetEntry {
  readonly category: string
  readonly gitCommand: string
  readonly jjCommand: string
  readonly note: string
}

/**
 * Complete command mapping for jj ← git.
 *
 * Organized by functional category with notes for important differences.
 * This data could be moved to MDX content in the future for extensibility.
 */
const jjGitCheatSheet: readonly CheatSheetEntry[] = [
  // BASICS
  {
    category: "BASICS",
    gitCommand: "git init",
    jjCommand: "jj git init",
    note: "",
  },
  {
    category: "BASICS",
    gitCommand: "git clone <url>",
    jjCommand: "jj git clone <url>",
    note: "",
  },
  {
    category: "BASICS",
    gitCommand: "git status",
    jjCommand: "jj status (jj st)",
    note: "",
  },
  {
    category: "BASICS",
    gitCommand: "git log",
    jjCommand: "jj log",
    note: "",
  },
  {
    category: "BASICS",
    gitCommand: "git diff",
    jjCommand: "jj diff",
    note: "",
  },
  {
    category: "BASICS",
    gitCommand: "git diff --staged",
    jjCommand: "jj diff --from @-",
    note: "No staging area in jj",
  },
  // COMMITS
  {
    category: "COMMITS",
    gitCommand: 'git add . && git commit -m "msg"',
    jjCommand: 'jj describe -m "msg"',
    note: "Changes auto-tracked",
  },
  {
    category: "COMMITS",
    gitCommand: "git commit --amend",
    jjCommand: "jj describe (on @)",
    note: "Edit working commit",
  },
  {
    category: "COMMITS",
    gitCommand: "(start new work)",
    jjCommand: "jj new",
    note: "Creates new working commit",
  },
  {
    category: "COMMITS",
    gitCommand: "git checkout <commit>",
    jjCommand: "jj new <commit>",
    note: "Create new commit at parent",
  },
  {
    category: "COMMITS",
    gitCommand: "git checkout <commit> (edit)",
    jjCommand: "jj edit <commit>",
    note: "Make commit the working copy",
  },
  // HISTORY
  {
    category: "HISTORY",
    gitCommand: "git rebase -i (fixup)",
    jjCommand: "jj squash",
    note: "Squash into parent",
  },
  {
    category: "HISTORY",
    gitCommand: "git rebase -i (split)",
    jjCommand: "jj split",
    note: "Interactive split",
  },
  {
    category: "HISTORY",
    gitCommand: "git rebase <onto>",
    jjCommand: "jj rebase -d <onto>",
    note: "Descendants auto-rebase",
  },
  {
    category: "HISTORY",
    gitCommand: "git cherry-pick <commit>",
    jjCommand: "jj new <parent>; jj squash --from <source>",
    note: "Two-step process",
  },
  {
    category: "HISTORY",
    gitCommand: "git show <commit>",
    jjCommand: "jj show <commit>",
    note: "",
  },
  // BRANCHES → BOOKMARKS
  {
    category: "BRANCHES",
    gitCommand: "git branch <name>",
    jjCommand: "jj bookmark create <name>",
    note: "jj uses bookmarks",
  },
  {
    category: "BRANCHES",
    gitCommand: "git checkout -b <name>",
    jjCommand: "jj new; jj bookmark create <name>",
    note: "No current branch concept",
  },
  {
    category: "BRANCHES",
    gitCommand: "git branch -d <name>",
    jjCommand: "jj bookmark delete <name>",
    note: "",
  },
  {
    category: "BRANCHES",
    gitCommand: "git branch -m <old> <new>",
    jjCommand: "jj bookmark rename <old> <new>",
    note: "",
  },
  {
    category: "BRANCHES",
    gitCommand: "git branch",
    jjCommand: "jj bookmark list",
    note: "",
  },
  // REMOTES
  {
    category: "REMOTES",
    gitCommand: "git fetch",
    jjCommand: "jj git fetch",
    note: "",
  },
  {
    category: "REMOTES",
    gitCommand: "git push",
    jjCommand: "jj git push",
    note: "Requires bookmark",
  },
  {
    category: "REMOTES",
    gitCommand: "git push -u origin <branch>",
    jjCommand: "jj git push -b <bookmark>",
    note: "jj requires bookmark name",
  },
  {
    category: "REMOTES",
    gitCommand: "git pull",
    jjCommand: "jj git fetch; jj rebase -d <bookmark>@origin",
    note: "No pull, use fetch+rebase",
  },
  // UNDO
  {
    category: "UNDO",
    gitCommand: "git reflog; git reset --hard",
    jjCommand: "jj undo",
    note: "Undo last operation",
  },
  {
    category: "UNDO",
    gitCommand: "(see operation history)",
    jjCommand: "jj op log",
    note: "View all operations",
  },
  {
    category: "UNDO",
    gitCommand: "git reset --hard <commit>",
    jjCommand: "jj op restore <operation>",
    note: "Restore to any operation",
  },
  {
    category: "UNDO",
    gitCommand: "git revert <commit>",
    jjCommand: 'jj new <commit>; jj new; jj describe -m "Revert"',
    note: "Manual revert process",
  },
  // CONFLICTS
  {
    category: "CONFLICTS",
    gitCommand: "git status (see conflicts)",
    jjCommand: "jj status",
    note: "Conflicts stored in commit",
  },
  {
    category: "CONFLICTS",
    gitCommand: "git add <resolved>",
    jjCommand: "jj resolve",
    note: "Mark conflict resolved",
  },
  {
    category: "CONFLICTS",
    gitCommand: "(view conflicts)",
    jjCommand: "jj resolve --list",
    note: "List all conflicts",
  },
  // ADVANCED
  {
    category: "ADVANCED",
    gitCommand: "git log --graph --oneline",
    jjCommand: "jj log --graph",
    note: "",
  },
  {
    category: "ADVANCED",
    gitCommand: "(find commits to rebase)",
    jjCommand: "jj log -r 'main..@'",
    note: "Revset: commits since main",
  },
  {
    category: "ADVANCED",
    gitCommand: "git describe",
    jjCommand: "jj describe",
    note: "Show full change id",
  },
] as const

/**
 * Get unique categories from cheat sheet entries.
 */
function getCategories(entries: readonly CheatSheetEntry[]): readonly string[] {
  const categories = new Set<string>()
  for (const entry of entries) {
    categories.add(entry.category)
  }
  return Array.from(categories)
}

/**
 * Copy button component for individual commands.
 *
 * @param text - The text to copy to clipboard.
 */
function CopyButton({ text }: { readonly text: string }): JSX.Element {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = () => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] transition-colors duration-[var(--transition-fast)]"
      aria-label={`Copy command: ${text}`}
    >
      [{copied ? "✓" : "Copy"}]
    </button>
  )
}

/**
 * Cheat sheet page component.
 *
 * Displays a two-column command reference table (git → jj) organized by category.
 * Includes copy buttons for each command and print-friendly styling.
 *
 * Features:
 * - Two-column layout (git left, jj right)
 * - Sections: Basics, Commits, History, Branches, Remotes, Undo, Conflicts, Advanced
 * - Copy button per row (copies jj command)
 * - Print-friendly styling (@media print)
 * - Print button in header
 */
export default function CheatSheetPage({
  params,
}: {
  readonly params: Promise<{ readonly toolPair: string }>
}) {
  // Using useState to handle params async and loading state
  const [toolPair, setToolPair] = React.useState<string | null>(null)
  const [notFoundState, setNotFoundState] = React.useState(false)

  React.useEffect(() => {
    void params.then((resolved) => {
      const { toolPair: resolvedToolPair } = resolved
      if (!isValidPairingSlug(resolvedToolPair)) {
        setNotFoundState(true)
      } else {
        setToolPair(resolvedToolPair)
      }
    })
  }, [params])

  if (notFoundState) {
    notFound()
  }

  if (!toolPair) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <p className="text-[var(--color-text-muted)]">Loading...</p>
      </div>
    )
  }

  const pairing = getPairing(toolPair)
  if (!pairing) {
    notFound()
  }

  const categories = getCategories(jjGitCheatSheet)

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header with back link, title, and print button */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href={`/${toolPair}`}
              className="inline-flex items-center text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] transition-colors duration-[var(--transition-fast)]"
            >
              ← {pairing.to.name} ← {pairing.from.name}
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold font-mono text-[var(--color-text)]">Cheat Sheet</h1>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center px-4 py-2 text-sm font-mono text-[var(--color-text)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md hover:bg-[var(--color-surface-hover)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] transition-all duration-[var(--transition-fast)]"
              aria-label="Print this cheat sheet"
            >
              [Print]
            </button>
          </div>
        </div>

        {/* Quick Reference heading */}
        <div className="mb-8">
          <h2 className="text-xl font-mono font-medium text-[var(--color-text)]">
            Quick Reference: {pairing.from.name} → {pairing.to.name}
          </h2>
          <div className="mt-2 h-0.5 w-16 bg-[var(--color-accent)]" />
        </div>

        {/* Cheat sheet table */}
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-4 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-6 py-3">
            <div className="col-span-1 text-xs font-mono font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
              {pairing.from.name}
            </div>
            <div className="col-span-1 text-center text-xs font-mono font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
              ║
            </div>
            <div className="col-span-9 text-xs font-mono font-medium text-[var(--color-text-muted)] uppercase tracking-wide text-right">
              {pairing.to.name}
            </div>
            <div className="col-span-1" />
          </div>

          {/* Command rows grouped by category */}
          {categories.map((category) => {
            const categoryEntries = jjGitCheatSheet.filter((entry) => entry.category === category)
            return (
              <div key={category}>
                {/* Category header */}
                <div className="border-b border-[var(--color-border)] bg-[var(--color-bg)] px-6 py-2">
                  <span className="text-sm font-mono font-medium text-[var(--color-text-muted)]">
                    {category}
                  </span>
                  <span className="ml-2 text-sm text-[var(--color-text-dim)]">─────────</span>
                </div>

                {/* Command rows in this category */}
                {categoryEntries.map((entry) => (
                  <div
                    key={`${category}-${entry.gitCommand}-${entry.jjCommand}`}
                    className="grid grid-cols-12 gap-4 border-b border-[var(--color-border)] px-6 py-3 last:border-b-0 hover:bg-[var(--color-surface-hover)] transition-colors duration-[var(--transition-fast)] print:hover:bg-transparent"
                  >
                    {/* Git command column */}
                    <div className="col-span-5 flex items-center">
                      <code className="text-sm font-mono text-[var(--color-accent-alt)]">
                        {entry.gitCommand}
                      </code>
                    </div>

                    {/* Divider */}
                    <div className="col-span-1 flex items-center justify-center">
                      <span className="text-[var(--color-text-dim)] text-sm">║</span>
                    </div>

                    {/* jj command column */}
                    <div className="col-span-5 flex items-center justify-end gap-2">
                      {entry.note && (
                        <span className="text-xs text-[var(--color-text-muted)] italic">
                          ({entry.note})
                        </span>
                      )}
                      <code className="text-sm font-mono text-[var(--color-accent)]">
                        {entry.jjCommand}
                      </code>
                    </div>

                    {/* Copy button column */}
                    <div className="col-span-1 flex items-center justify-end">
                      <CopyButton text={entry.jjCommand} />
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        {/* Print-only footer */}
        <div className="mt-8 text-sm text-[var(--color-text-muted)] print:block hidden">
          <p>
            Cheat sheet for {pairing.to.name} if you already know {pairing.from.name}.
          </p>
          <p className="mt-2">Visit toolkata.com for interactive tutorials.</p>
        </div>
      </main>

      <Footer />
    </div>
  )
}
