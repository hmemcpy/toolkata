/**
 * Shared types for glossary entries.
 *
 * This module defines common types used across all glossary data modules
 * to ensure type compatibility when passing glossary data to components.
 *
 * @module
 */

/**
 * Glossary entry type that can be extended by specific tool pairings.
 *
 * Each tool pairing should define its own GlossaryCategory union type
 * and use this interface for the entry structure.
 */
export interface GlossaryEntry {
  /** Unique identifier for React keys */
  readonly id: string
  /** Category grouping for this entry (specific to each pairing) */
  readonly category: string
  /** Source command/API (e.g., git command, ZIO API) */
  readonly fromCommand: string
  /** Target command/API (e.g., jj command, Cats Effect API) */
  readonly toCommand: string
  /** Optional note about differences or usage */
  readonly note: string
}

/**
 * Cheat sheet entry type for single-tool tutorials.
 *
 * Used for command reference pages where there's only one tool
 * (e.g., tmux, vim) rather than a comparison between two tools.
 */
export interface CheatSheetEntry {
  /** Unique identifier for React keys */
  readonly id: string
  /** Category grouping for this entry */
  readonly category: string
  /** The command or syntax */
  readonly command: string
  /** Description of what the command does */
  readonly description: string
  /** Optional note about usage or caveats */
  readonly note?: string
}
