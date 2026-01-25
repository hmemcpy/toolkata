/**
 * tool-config.ts - Tool-pair configuration loader for config.yml files.
 *
 * Loads default sandbox settings from tool-pair config.yml files.
 * These provide defaults that can be overridden by step frontmatter.
 */

import * as path from "node:path"
import { Effect } from "effect"
import { loadFile } from "./loader"
import type { ContentError } from "./errors"

/**
 * Raw config.yml structure (before validation).
 */
export interface RawToolConfig {
  readonly defaults?: {
    readonly sandbox?: {
      readonly enabled?: boolean
      readonly environment?: "bash" | "node" | "python"
      readonly timeout?: number
      readonly init?: readonly string[]
    }
  }
}

/**
 * Parsed tool-pair configuration.
 */
export interface ToolConfig {
  readonly sandbox: {
    readonly enabled: boolean
    readonly environment: "bash" | "node" | "python"
    readonly timeout: number
    readonly init: readonly string[]
  }
}

/**
 * Helper type for sandbox config parsing.
 */
type SandboxConfig = {
  readonly enabled: boolean
  readonly environment: "bash" | "node" | "python"
  readonly timeout: number
  readonly init: readonly string[]
}

/**
 * Global defaults when no config.yml exists.
 */
export const DEFAULT_TOOL_CONFIG: ToolConfig = {
  sandbox: {
    enabled: true,
    environment: "bash",
    timeout: 60,
    init: [],
  },
}

/**
 * Parse and validate config.yml content.
 */
function parseToolConfig(yaml: string, _filePath: string): Effect.Effect<ToolConfig, ContentError> {
  const extracted = extractYamlValues(yaml)

  if (!extracted.defaults?.sandbox) {
    return Effect.succeed(DEFAULT_TOOL_CONFIG)
  }

  const sandboxRaw = extracted.defaults.sandbox

  return Effect.succeed({
    sandbox: {
      enabled: sandboxRaw.enabled ?? DEFAULT_TOOL_CONFIG.sandbox.enabled,
      environment: sandboxRaw.environment ?? DEFAULT_TOOL_CONFIG.sandbox.environment,
      timeout: sandboxRaw.timeout ?? DEFAULT_TOOL_CONFIG.sandbox.timeout,
      init: sandboxRaw.init ?? DEFAULT_TOOL_CONFIG.sandbox.init,
    },
  } as const)
}

/**
 * Simple YAML value extractor for our config format.
 * This is a lightweight alternative to a full YAML parser.
 */
function extractYamlValues(yaml: string): RawToolConfig {
  // Extract the defaults section to avoid matching values in comments
  const defaultsMatch = yaml.match(/defaults:\s*\n((?:[ \t]+[^\n]+\n?)+)/)

  if (!defaultsMatch) {
    return {}
  }

  const defaultsSection = defaultsMatch[1] ?? ""

  const enabledMatch = defaultsSection.match(/enabled:\s*(true|false)/)
  const envMatch = defaultsSection.match(/environment:\s*(bash|node|python)/)
  const timeoutMatch = defaultsSection.match(/timeout:\s*(\d+)/)
  const initMatches = defaultsSection.match(/init:\s*\n((?:\s*-\s*[^\n]+\n?)+)/)

  const sandboxConfig: Partial<SandboxConfig> = {}

  if (enabledMatch) {
    Object.assign(sandboxConfig, { enabled: enabledMatch[1] === "true" })
  }

  if (envMatch) {
    Object.assign(sandboxConfig, { environment: envMatch[1] as "bash" | "node" | "python" })
  }

  if (timeoutMatch) {
    Object.assign(sandboxConfig, { timeout: Number.parseInt(timeoutMatch[1] ?? "0", 10) })
  }

  if (initMatches?.[1]) {
    const initLines = initMatches[1].trim().split("\n")
    const init = initLines
      .map((line) => line.replace(/^\s*-\s*/, "").trim())
      .filter((line) => line.length > 0)
    Object.assign(sandboxConfig, { init })
  }

  if (Object.keys(sandboxConfig).length === 0) {
    return {}
  }

  return {
    defaults: {
      sandbox: sandboxConfig,
    },
  }
}

/**
 * Load tool-pair configuration from config.yml.
 *
 * @param toolPair - The tool pair slug (e.g., "jj-git")
 * @param contentRoot - Root directory for content files
 * @returns Tool config or defaults if file doesn't exist
 */
export function loadToolConfig(
  toolPair: string,
  contentRoot: string,
): Effect.Effect<ToolConfig, ContentError> {
  return Effect.gen(function* () {
    const configPath = path.join(contentRoot, toolPair, "config.yml")

    const result = yield* Effect.either(loadFile(configPath))

    if (result._tag === "Left") {
      // File doesn't exist or is unreadable - use defaults
      return DEFAULT_TOOL_CONFIG
    }

    return yield* parseToolConfig(result.right.raw, configPath)
  })
}
