/**
 * Tool pairing registry for toolkata.
 *
 * Defines all available tool comparisons (X if you know Y).
 * Each pairing includes metadata for routing, display, and content loading.
 *
 * @example
 * ```ts
 * import { toolPairings, getPairing } from "./pairings"
 *
 * const jjGit = getPairing("jj-git")
 * // { slug: "jj-git", from: { name: "git", ... }, ... }
 * ```
 */

/**
 * Status of a tool pairing.
 */
export type PairingStatus = "published" | "coming_soon"

/**
 * Mode discriminator for tutorial entries.
 */
export type TutorialMode = "pairing" | "tutorial"

/**
 * Tool pairing metadata interface (comparison mode: X if you know Y).
 */
export interface ToolPairing {
  /**
   * Mode discriminator for this entry.
   */
  readonly mode: "pairing"

  /**
   * URL-safe slug for routing (e.g., "jj-git", "nix-brew").
   */
  readonly slug: string

  /**
   * The source tool (what users already know).
   */
  readonly from: {
    readonly name: string
    readonly description: string
    readonly color?: string
    readonly icon?: string
  }

  /**
   * The target tool (what users want to learn).
   */
  readonly to: {
    readonly name: string
    readonly description: string
    readonly color?: string
    readonly icon?: string
  }

  /**
   * Category for grouping on home page.
   */
  readonly category:
    | "Version Control"
    | "Package Management"
    | "Build Tools"
    | "Frameworks & Libraries"
    | "Other"

  /**
   * Total number of tutorial steps.
   */
  readonly steps: number

  /**
   * Estimated completion time.
   */
  readonly estimatedTime: string

  /**
   * Publication status.
   */
  readonly status: PairingStatus

  /**
   * GitHub URL for the "to" tool (for footer link).
   */
  readonly toUrl?: string

  /**
   * Searchable tags for discoverability.
   */
  readonly tags?: readonly string[]

  /**
   * Primary programming language of the target tool.
   */
  readonly language?: "typescript" | "scala" | "shell" | "other"
}

/**
 * Single tool tutorial metadata interface (tutorial mode: learn X).
 */
export interface SingleToolEntry {
  /**
   * Mode discriminator for this entry.
   */
  readonly mode: "tutorial"

  /**
   * URL-safe slug for routing (e.g., "tmux", "vim").
   */
  readonly slug: string

  /**
   * The tool being learned.
   */
  readonly tool: {
    readonly name: string
    readonly description: string
    readonly color?: string
    readonly icon?: string
  }

  /**
   * Category for grouping on home page.
   */
  readonly category:
    | "Version Control"
    | "Package Management"
    | "Build Tools"
    | "Frameworks & Libraries"
    | "Other"

  /**
   * Total number of tutorial steps.
   */
  readonly steps: number

  /**
   * Estimated completion time.
   */
  readonly estimatedTime: string

  /**
   * Publication status.
   */
  readonly status: PairingStatus

  /**
   * GitHub URL for the tool (for footer link).
   */
  readonly toolUrl?: string

  /**
   * Searchable tags for discoverability.
   */
  readonly tags?: readonly string[]

  /**
   * Primary programming language of the tool.
   */
  readonly language?: "typescript" | "scala" | "shell" | "other"
}

/**
 * Union type for all tutorial entries (pairings and single-tool tutorials).
 */
export type TutorialEntry = ToolPairing | SingleToolEntry

/**
 * Type guard to check if a tutorial entry is a pairing (comparison mode).
 *
 * @param entry - The tutorial entry to check.
 * @returns `true` if the entry is a ToolPairing.
 */
export function isPairing(entry: TutorialEntry): entry is ToolPairing {
  return entry.mode === "pairing"
}

/**
 * Type guard to check if a tutorial entry is a single-tool tutorial.
 *
 * @param entry - The tutorial entry to check.
 * @returns `true` if the entry is a SingleToolEntry.
 */
export function isTutorial(entry: TutorialEntry): entry is SingleToolEntry {
  return entry.mode === "tutorial"
}

/**
 * Registry of all tutorial entries (pairings and single-tool tutorials).
 *
 * Published pairings: zio-cats, jj-git, effect-zio.
 * Published tutorials: tmux.
 * Others are placeholders for future expansion.
 */
export const toolEntries = [
  {
    mode: "pairing" as const,
    slug: "zio-cats",
    from: {
      name: "Cats Effect",
      description: "Cats Effect 3",
      color: "#8b5cf6",
      icon: "scala",
    },
    to: {
      name: "ZIO",
      description: "Learn ZIO 2.0",
      color: "#0066ff",
      icon: "scala",
    },
    category: "Frameworks & Libraries" as const,
    steps: 15,
    estimatedTime: "~70 min",
    status: "published" as const,
    toUrl: "https://zio.dev/",
    language: "scala" as const,
    tags: ["scala", "zio", "cats-effect", "functional"] as const,
  },
  {
    mode: "pairing" as const,
    slug: "jj-git",
    from: {
      name: "git",
      description: "Distributed VCS",
      color: "#f05032",
      icon: "git-branch",
    },
    to: {
      name: "jj",
      description: "jj for git experts",
      color: "#39d96c",
      icon: "arrows-clockwise",
    },
    category: "Version Control" as const,
    steps: 12,
    estimatedTime: "~40 min",
    status: "published" as const,
    toUrl: "https://github.com/jj-vcs/jj",
    language: "shell" as const,
    tags: ["git", "jj", "vcs", "version-control"] as const,
  },
  {
    mode: "pairing" as const,
    slug: "effect-zio",
    from: {
      name: "ZIO",
      description: "ZIO 2",
      color: "#DC322F",
      icon: "scala",
    },
    to: {
      name: "Effect",
      description: "Effect.TS for ZIO developers",
      color: "#3178C6",
      icon: "typescript",
    },
    category: "Frameworks & Libraries" as const,
    steps: 15,
    estimatedTime: "~75 min",
    status: "published" as const,
    toUrl: "https://effect.website",
    language: "typescript" as const,
    tags: ["typescript", "effect", "zio", "scala", "functional"] as const,
  },
  // Future pairings (commented out until content is ready)
  // {
  //   slug: "pijul-git",
  //   from: {
  //     name: "git",
  //     description: "Distributed VCS",
  //   },
  //   to: {
  //     name: "pijul",
  //     description: "Patch-based VCS",
  //   },
  //   category: "Version Control" as const,
  //   steps: 8,
  //   estimatedTime: "~25 min",
  //   status: "coming_soon" as const,
  //   toUrl: "https://pijul.org",
  // },
  // {
  //   slug: "nix-brew",
  //   from: {
  //     name: "homebrew",
  //     description: "macOS Package Manager",
  //   },
  //   to: {
  //     name: "nix",
  //     description: "Reproducible Package Manager",
  //   },
  //   category: "Package Management" as const,
  //   steps: 10,
  //   estimatedTime: "~35 min",
  //   status: "coming_soon" as const,
  //   toUrl: "https://nixos.org",
  // },
  {
    mode: "tutorial" as const,
    slug: "tmux",
    tool: {
      name: "tmux",
      description: "Terminal multiplexer",
      color: "#1bbf4e",
      icon: "terminal",
    },
    category: "Other" as const,
    steps: 8,
    estimatedTime: "~30 min",
    status: "published" as const,
    toolUrl: "https://github.com/tmux/tmux",
    language: "shell" as const,
    tags: ["tmux", "terminal", "multiplexer", "shell"] as const,
  },
] as const satisfies readonly TutorialEntry[]

/**
 * Legacy export for backward compatibility.
 * @deprecated Use `toolEntries` instead.
 */
export const toolPairings = toolEntries.filter(isPairing) as readonly ToolPairing[]

/**
 * Get a tutorial entry by slug.
 *
 * @param slug - The entry slug (e.g., "jj-git", "tmux").
 * @returns The entry if found, `null` otherwise.
 */
export function getEntry(slug: string): TutorialEntry | null {
  return toolEntries.find((entry) => entry.slug === slug) ?? null
}

/**
 * Get a tool pairing by slug (legacy function).
 *
 * @param slug - The pairing slug (e.g., "jj-git").
 * @returns The pairing if found, `null` otherwise.
 * @deprecated Use `getEntry` instead.
 */
export function getPairing(slug: string): ToolPairing | null {
  const entry = getEntry(slug)
  return entry && isPairing(entry) ? entry : null
}

/**
 * Get all published tutorial entries.
 *
 * @returns Array of published entries.
 */
export function getPublishedEntries(): readonly TutorialEntry[] {
  return toolEntries.filter((entry) => entry.status === "published")
}

/**
 * Get all published pairings (legacy function).
 *
 * @returns Array of published pairings.
 * @deprecated Use `getPublishedEntries` with `isPairing` filter instead.
 */
export function getPublishedPairings(): readonly ToolPairing[] {
  return toolEntries.filter((entry) => entry.status === "published" && isPairing(entry)) as ToolPairing[]
}

/**
 * Get all entries grouped by category.
 *
 * @returns Object mapping category names to arrays of entries.
 */
export function getEntriesByCategory(): Record<string, readonly TutorialEntry[]> {
  const grouped: Record<string, TutorialEntry[]> = {}

  for (const entry of toolEntries) {
    const category = entry.category
    grouped[category] ??= []
    grouped[category]?.push(entry)
  }

  return grouped
}

/**
 * Get all pairings grouped by category (legacy function).
 *
 * @returns Object mapping category names to arrays of pairings.
 * @deprecated Use `getEntriesByCategory` with `isPairing` filter instead.
 */
export function getPairingsByCategory(): Record<string, readonly ToolPairing[]> {
  const grouped: Record<string, ToolPairing[]> = {}

  for (const entry of toolEntries) {
    if (!isPairing(entry)) continue
    const category = entry.category
    grouped[category] ??= []
    grouped[category]?.push(entry)
  }

  return grouped
}

/**
 * Type guard to check if a string is a valid entry slug.
 *
 * @param slug - The string to check.
 * @returns `true` if the slug exists in the registry.
 */
export function isValidEntrySlug(slug: string): slug is TutorialEntry["slug"] {
  return toolEntries.some((entry) => entry.slug === slug)
}

/**
 * Type guard to check if a string is a valid pairing slug (legacy function).
 *
 * @param slug - The string to check.
 * @returns `true` if the slug exists in the registry as a pairing.
 * @deprecated Use `isValidEntrySlug` instead.
 */
export function isValidPairingSlug(slug: string): slug is ToolPairing["slug"] {
  return toolEntries.some((entry) => entry.slug === slug && isPairing(entry))
}
