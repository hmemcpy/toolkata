/**
 * Kata Parsers - Parse jj command output for validation.
 *
 * Provides structured parsing of jj command output to enable
 * sophisticated validation of exercise solutions.
 *
 * @example
 * ```ts
 * import { parseJjLog } from "./lib/kata/parsers"
 *
 * const commits = parseJjLog(output)
 * console.log(`Found ${commits.length} commits`)
 * ```
 */

/**
 * ANSI escape code pattern for stripping color codes.
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape codes are required for terminal output parsing
const ANSI_CODE_PATTERN = /\x1b\[[0-9;]*m/g

/**
 * Strip ANSI escape codes from terminal output.
 */
function stripAnsiCodes(input: string): string {
  return input.replace(ANSI_CODE_PATTERN, "")
}

/**
 * Parsed commit information from `jj log`.
 */
export interface Commit {
  /**
   * The commit ID (short change ID).
   */
  readonly id: string

  /**
   * The commit message (first line of description).
   */
  readonly message: string

  /**
   * The commit author.
   */
  readonly author: string

  /**
   * The commit timestamp (when it was created).
   */
  readonly timestamp: string

  /**
   * Whether this is the working copy commit (@).
   */
  readonly isWorkingCopy: boolean

  /**
   * Bookmark names pointing to this commit (if any).
   */
  readonly bookmarks: readonly string[]
}

/**
 * Parse `jj log` output into structured commit data.
 *
 * @param output - Raw output from `jj log` command
 * @returns Array of parsed commits
 *
 * @example
 * ```ts
 * const output = `
 *   o abc123 Fix bug
 *   @ def456 Add feature
 *   │
 *   ┆
 * `
 * const commits = parseJjLog(output)
 * // [{ id: "abc123", message: "Fix bug", isWorkingCopy: false }, ...]
 * ```
 */
export function parseJjLog(output: string): readonly Commit[] {
  const trimmed = stripAnsiCodes(output).trim()
  const lines = trimmed.split("\n")

  // Pattern for commit line: "o abc123 Commit message" or "@ abc123 Commit message"
  const commitPattern = /^([o@◆])\s+([a-f0-9]+)\s+(.+)$/

  const commits: Commit[] = []

  for (const line of lines) {
    const match = line.match(commitPattern)
    if (match?.[1] && match[2] && match[3]) {
      const marker = match[1]
      const id = match[2]
      const message = match[3]
      commits.push({
        id,
        message: message.trim(),
        author: "", // jj log doesn't show author by default
        timestamp: "", // jj log doesn't show timestamp by default
        isWorkingCopy: marker === "@",
        bookmarks: [],
      })
    }
  }

  return commits
}

/**
 * Parsed status information from `jj status`.
 */
export interface Status {
  /**
   * The parent commit ID.
   */
  readonly parentCommit: string

  /**
   * The active bookmark name (if any).
   */
  readonly activeBookmark: string | null

  /**
   * List of conflicting change IDs.
   */
  readonly conflicts: readonly string[]

  /**
   * Working copy files that have been modified.
   */
  readonly modifiedFiles: readonly string[]

  /**
   * Working copy files that have been added.
   */
  readonly addedFiles: readonly string[]
}

/**
 * Parse `jj status` output into structured status data.
 *
 * @param output - Raw output from `jj status` command
 * @returns Parsed status information
 *
 * @example
 * ```ts
 * const output = `
 *   Parent: abc123 123456789
 *   Working copy stats:
 *   M file.txt
 *   A newfile.txt
 * `
 * const status = parseJjStatus(output)
 * // { parentCommit: "abc123", modifiedFiles: ["file.txt"], ... }
 * ```
 */
export function parseJjStatus(output: string): Status {
  const trimmed = stripAnsiCodes(output).trim()
  const lines = trimmed.split("\n")

  // Use mutable intermediate arrays
  const conflicts: string[] = []
  const modifiedFiles: string[] = []
  const addedFiles: string[] = []

  let parentCommit = ""
  let activeBookmark: string | null = null

  for (const line of lines) {
    // Parent commit: "Parent: abc123 123456789"
    const parentMatch = line.match(/^Parent:\s+([a-f0-9]+)/)
    if (parentMatch?.[1]) {
      parentCommit = parentMatch[1]
      continue
    }

    // Active bookmark: "Active bookmark: main"
    const bookmarkMatch = line.match(/^Active bookmark:\s+(\S+)/)
    if (bookmarkMatch?.[1]) {
      activeBookmark = bookmarkMatch[1]
      continue
    }

    // Conflicting changes: "Conflict: abc123 def456"
    const conflictMatch = line.match(/(?:Conflicting changes|Conflicts):\s+(.+)/)
    if (conflictMatch?.[1]) {
      conflicts.push(...conflictMatch[1].split(/\s+/).filter(Boolean))
      continue
    }

    // Modified files: "M file.txt" or " M file.txt" (git status style)
    const modifiedMatch = line.match(/^[A-Z]?\s*M\s+(.+)$/)
    if (modifiedMatch?.[1]) {
      modifiedFiles.push(modifiedMatch[1].trim())
      continue
    }

    // Added files: "A newfile.txt" or " A newfile.txt"
    const addedMatch = line.match(/^[A-Z]?\s*A\s+(.+)$/)
    if (addedMatch?.[1]) {
      addedFiles.push(addedMatch[1].trim())
    }
  }

  return {
    parentCommit,
    activeBookmark,
    conflicts,
    modifiedFiles,
    addedFiles,
  }
}

/**
 * Parsed commit details from `jj show`.
 */
export interface CommitInfo {
  /**
   * The change ID (full).
   */
  readonly changeId: string

  /**
   * The commit ID (short change ID).
   */
  readonly commitId: string

  /**
   * The commit description (full message).
   */
  readonly description: string

  /**
   * The commit author.
   */
  readonly author: string

  /**
   * The commit timestamp.
   */
  readonly timestamp: string

  /**
   * The parent commit IDs.
   */
  readonly parents: readonly string[]

  /**
   * Bookmark names pointing to this commit.
   */
  readonly bookmarks: readonly string[]

  /**
   * Whether this is an immutable commit.
   */
  readonly immutable: boolean
}

/**
 * Parse `jj show` output into structured commit details.
 *
 * @param output - Raw output from `jj show` command
 * @returns Parsed commit information
 *
 * @example
 * ```ts
 * const output = `
 *   Change ID: abc123 123456789
 *   Author: Test User <test@example.com>
 *   Date: Today
 *   Description: Fix bug
 * `
 * const info = parseJjShow(output)
 * // { changeId: "abc123", description: "Fix bug", ... }
 * ```
 */
export function parseJjShow(output: string): CommitInfo {
  const trimmed = stripAnsiCodes(output).trim()

  // Use mutable intermediate variables
  let changeId = ""
  let commitId = ""
  let author = ""
  let timestamp = ""
  const parents: string[] = []
  const bookmarks: string[] = []
  let immutable = false
  const descriptionLines: string[] = []

  const lines = trimmed.split("\n")
  let inDescription = false

  for (const line of lines) {
    // Change ID: "Change ID: abc123 123456789"
    const changeIdMatch = line.match(/^Change ID:\s+([a-f0-9]+)/)
    if (changeIdMatch?.[1]) {
      changeId = changeIdMatch[1]
      commitId = changeIdMatch[1]
      continue
    }

    // Author: "Author: Test User <test@example.com>"
    const authorMatch = line.match(/^Author:\s+(.+)$/)
    if (authorMatch?.[1]) {
      author = authorMatch[1].trim()
      continue
    }

    // Date/Time: "Date: ..." or "Committed: ..."
    const timeMatch = line.match(/^(?:Date|Committed):\s+(.+)$/)
    if (timeMatch?.[1]) {
      timestamp = timeMatch[1].trim()
      continue
    }

    // Parents: "Parent: abc123" or "Parents: abc123 def456"
    const parentMatch = line.match(/^Parents?:\s+(.+)$/)
    if (parentMatch?.[1]) {
      parents.push(...parentMatch[1].split(/\s+/).filter(Boolean))
      continue
    }

    // Bookmarks: "Bookmarks: main, feature"
    const bookmarkMatch = line.match(/^Bookmarks?:\s+(.+)$/)
    if (bookmarkMatch?.[1]) {
      bookmarks.push(...bookmarkMatch[1].split(/[,]\s*/).filter(Boolean))
      continue
    }

    // Immutable flag: "Immutable" or "This change is immutable"
    if (line.match(/immutable/i)) {
      immutable = true
      continue
    }

    // Description starts after "Description:" or empty line
    if (line.startsWith("Description:") || line === "") {
      inDescription = true
      continue
    }

    // Collect description lines
    if (inDescription) {
      descriptionLines.push(line.trim())
    }
  }

  return {
    changeId,
    commitId,
    description: descriptionLines.join("\n").trim(),
    author,
    timestamp,
    parents,
    bookmarks,
    immutable,
  }
}

/**
 * Parsed bookmark information from `jj bookmark list`.
 */
export interface Bookmark {
  /**
   * The bookmark name.
   */
  readonly name: string

  /**
   * The commit ID the bookmark points to.
   */
  readonly commitId: string

  /**
   * Whether this is the active bookmark.
   */
  readonly isActive: boolean

  /**
   * Whether the bookmark is conflicted.
   */
  readonly isConflicted: boolean
}

/**
 * Parse `jj bookmark list` output into structured bookmark data.
 *
 * @param output - Raw output from `jj bookmark list` command
 * @returns Array of parsed bookmarks
 *
 * @example
 * ```ts
 * const output = `
 *   * main: abc123
 *     feature: def456
 * `
 * const bookmarks = parseJjBookmarkList(output)
 * // [{ name: "main", commitId: "abc123", isActive: true }, ...]
 * ```
 */
export function parseJjBookmarkList(output: string): readonly Bookmark[] {
  const trimmed = stripAnsiCodes(output).trim()
  const lines = trimmed.split("\n")

  // Pattern: "* main: abc123" or "  feature: def456"
  const bookmarkPattern = /^([*])?\s*(\S+):\s+([a-f0-9]+)/

  const bookmarks: Bookmark[] = []

  for (const line of lines) {
    const match = line.match(bookmarkPattern)
    if (match?.[2] && match[3]) {
      const activeMarker = match[1]
      const name = match[2]
      const commitId = match[3]
      bookmarks.push({
        name,
        commitId,
        isActive: activeMarker === "*",
        isConflicted: line.includes("(conflicted)"),
      })
    }
  }

  return bookmarks
}
