/**
 * Content Core - Type-safe MDX content loading with Effect-TS.
 *
 * Provides:
 * - Content type definition with Zod schema validation
 * - File loading with frontmatter parsing (gray-matter)
 * - In-memory caching with TTL support
 * - Composable services using Effect-TS layers
 */

// Core types
export type { Content, ContentType } from "./content-type"
export { defineContentType } from "./content-type"

// Errors
export { ContentError } from "./errors"
export type { ContentErrorCause } from "./errors"

// Services
export { ContentService, ContentServiceLive } from "./service"
export type { ContentServiceShape } from "./service"

export { ContentConfig, ContentConfigLive } from "./config"
export type { ContentConfigService } from "./config"

export { CacheService, CacheServiceLive } from "./cache"
export type { CacheServiceShape } from "./cache"
