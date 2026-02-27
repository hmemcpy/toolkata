/**
 * Content Core - Type-safe MDX content loading with Effect-TS.
 *
 * Provides:
 * - Content type definition with Zod schema validation
 * - File loading with frontmatter parsing (gray-matter)
 * - Composable services using Effect-TS layers
 * - Tool-pair configuration loading from config.yml
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

// Tool-pair configuration
export { loadToolConfig, DEFAULT_TOOL_CONFIG } from "./tool-config"
export type { ToolConfig, RawToolConfig } from "./tool-config"
