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
 * Tool pairing metadata interface.
 */
export interface ToolPairing {
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
  }

  /**
   * The target tool (what users want to learn).
   */
  readonly to: {
    readonly name: string
    readonly description: string
  }

  /**
   * Category for grouping on home page.
   */
  readonly category: "Version Control" | "Package Management" | "Build Tools" | "Other"

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
}

/**
 * Registry of all tool pairings.
 *
 * MVP: Only jj-git is published. Others are placeholders for future expansion.
 */
export const toolPairings = [
  {
    slug: "jj-git",
    from: {
      name: "git",
      description: "Distributed VCS",
    },
    to: {
      name: "jj",
      description: "Jujutsu VCS",
    },
    category: "Version Control" as const,
    steps: 12,
    estimatedTime: "~40 min",
    status: "published" as const,
    toUrl: "https://github.com/jj-vcs/jj",
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
] as const satisfies readonly ToolPairing[]

/**
 * Get a tool pairing by slug.
 *
 * @param slug - The pairing slug (e.g., "jj-git").
 * @returns The pairing if found, `null` otherwise.
 */
export function getPairing(slug: string): ToolPairing | null {
  return toolPairings.find((pairing) => pairing.slug === slug) ?? null
}

/**
 * Get all published pairings.
 *
 * @returns Array of published pairings.
 */
export function getPublishedPairings(): readonly ToolPairing[] {
  return toolPairings.filter((pairing) => pairing.status === "published")
}

/**
 * Get all pairings grouped by category.
 *
 * @returns Object mapping category names to arrays of pairings.
 */
export function getPairingsByCategory(): Record<string, readonly ToolPairing[]> {
  const grouped: Record<string, ToolPairing[]> = {}

  for (const pairing of toolPairings) {
    const category = pairing.category
    grouped[category] ??= []
    grouped[category]?.push(pairing)
  }

  return grouped
}

/**
 * Type guard to check if a string is a valid pairing slug.
 *
 * @param slug - The string to check.
 * @returns `true` if the slug exists in the registry.
 */
export function isValidPairingSlug(slug: string): slug is ToolPairing["slug"] {
  return toolPairings.some((pairing) => pairing.slug === slug)
}
