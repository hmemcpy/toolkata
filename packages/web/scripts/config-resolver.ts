/**
 * Config Resolver - Merges validation config from pairing, step, and component levels.
 *
 * Config hierarchy (from lowest to highest priority):
 * 1. Pairing-level prelude (config.yml)
 * 2. Step-level frontmatter (01-step.mdx)
 * 3. Component-level props (<TryIt setup={...} />)
 *
 * Merging rules:
 * - imports: Concatenated (pairing + step + component)
 * - setup: Override (component > step > pairing)
 * - wrapper: Override (component > step > pairing)
 */

import { readFile } from "node:fs/promises"
import { join } from "node:path"
import matter from "gray-matter"
import { parse as parseYaml } from "yaml"

/**
 * Validation prelude configuration for imports, setup commands, and code wrapper.
 */
export interface ValidationPrelude {
  /** Import statements to prepend to code snippets (Scala/TypeScript) */
  readonly imports?: readonly string[]
  /** Shell commands to run before validation (bash) */
  readonly setup?: readonly string[]
  /** Code wrapper template with ${code} placeholder (Scala) */
  readonly wrapper?: string
}

/**
 * Validation configuration for a single environment.
 */
export interface ValidationEnvironmentConfig {
  /** Sandbox environment type */
  readonly environment: "bash" | "scala" | "typescript"
  /** Prelude configuration for this environment */
  readonly prelude?: ValidationPrelude
}

/**
 * Complete validation configuration from config.yml.
 * Supports primary and secondary environments (e.g., effect-zio has both TS and Scala).
 */
export interface PairingValidationConfig extends ValidationEnvironmentConfig {
  /** Secondary environment for multi-language pairings */
  readonly secondary?: ValidationEnvironmentConfig
}

/**
 * Step-level validation config (from MDX frontmatter).
 */
export interface StepValidationConfig {
  /** Additional imports to add for this step (concatenated with pairing) */
  readonly imports?: readonly string[]
  /** Override setup commands for this step */
  readonly setup?: readonly string[]
  /** Override wrapper for this step */
  readonly wrapper?: string
}

/**
 * Component-level validation config (from component props).
 */
export interface ComponentValidationConfig {
  /** Skip validation for this snippet */
  readonly validate?: boolean
  /** Override setup commands for this snippet */
  readonly setup?: readonly string[]
  /** Additional imports for this snippet (concatenated) */
  readonly extraImports?: readonly string[]
}

/**
 * Fully resolved validation config for a specific snippet.
 */
export interface ResolvedValidationConfig {
  /** Sandbox environment type */
  readonly environment: "bash" | "scala" | "typescript"
  /** All imports to prepend (concatenated from all levels) */
  readonly imports: readonly string[]
  /** Setup commands to run (from highest priority level that defines them) */
  readonly setup: readonly string[]
  /** Code wrapper template (from highest priority level that defines it) */
  readonly wrapper?: string
  /** Whether validation should be skipped */
  readonly skip: boolean
}

/**
 * Raw config.yml structure before parsing.
 */
interface RawPairingConfig {
  defaults?: {
    sandbox?: {
      enabled?: boolean
      environment?: string
      timeout?: number
      init?: string[]
    }
  }
  validation?: {
    environment?: string
    prelude?: {
      imports?: string[]
      setup?: string[]
      wrapper?: string
    }
    secondary?: {
      environment?: string
      prelude?: {
        imports?: string[]
        setup?: string[]
        wrapper?: string
      }
    }
  }
}

/**
 * Raw step frontmatter structure.
 */
interface RawStepFrontmatter {
  title?: string
  step?: number
  description?: string
  validation?: {
    imports?: string[]
    setup?: string[]
    wrapper?: string
  }
}

/**
 * Cache for loaded pairing configs to avoid re-reading files.
 */
const pairingConfigCache = new Map<string, PairingValidationConfig | null>()

/**
 * Cache for loaded step configs.
 */
const stepConfigCache = new Map<string, StepValidationConfig | null>()

/**
 * Load and parse pairing validation config from config.yml.
 *
 * @param contentDir - Root content directory (e.g., "packages/web/content")
 * @param toolPair - Tool pairing name (e.g., "jj-git")
 * @returns Parsed validation config or null if not configured
 */
export async function loadPairingConfig(
  contentDir: string,
  toolPair: string,
): Promise<PairingValidationConfig | null> {
  const cacheKey = `${contentDir}:${toolPair}`
  const cached = pairingConfigCache.get(cacheKey)
  if (cached !== undefined) return cached

  const configPath = join(contentDir, "comparisons", toolPair, "config.yml")

  let rawContent: string
  try {
    rawContent = await readFile(configPath, "utf-8")
  } catch {
    // Config file doesn't exist
    pairingConfigCache.set(cacheKey, null)
    return null
  }

  const raw = parseYaml(rawContent) as RawPairingConfig

  // If no validation section, try to infer from defaults.sandbox
  if (!raw.validation) {
    // Fallback: use defaults.sandbox.environment if available
    const defaultEnv = raw.defaults?.sandbox?.environment
    if (defaultEnv === "bash" || defaultEnv === "scala" || defaultEnv === "typescript") {
      const initCommands = raw.defaults?.sandbox?.init
      const config: PairingValidationConfig = initCommands
        ? {
            environment: defaultEnv,
            prelude: { setup: initCommands },
          }
        : { environment: defaultEnv }
      pairingConfigCache.set(cacheKey, config)
      return config
    }
    pairingConfigCache.set(cacheKey, null)
    return null
  }

  const validEnv = raw.validation.environment
  if (validEnv !== "bash" && validEnv !== "scala" && validEnv !== "typescript") {
    pairingConfigCache.set(cacheKey, null)
    return null
  }

  const config = buildPairingConfig(validEnv, raw.validation.prelude, raw.validation.secondary)

  pairingConfigCache.set(cacheKey, config)
  return config
}

/**
 * Build a ValidationPrelude, only including properties that have values.
 */
function buildPrelude(
  rawPrelude:
    | {
        imports?: string[]
        setup?: string[]
        wrapper?: string
      }
    | undefined,
): ValidationPrelude | undefined {
  if (!rawPrelude) return undefined

  const { imports, setup, wrapper } = rawPrelude

  // Only include properties that exist
  if (!imports && !setup && !wrapper) return undefined

  const prelude: ValidationPrelude = {}
  if (imports) (prelude as { imports: readonly string[] }).imports = imports
  if (setup) (prelude as { setup: readonly string[] }).setup = setup
  if (wrapper) (prelude as { wrapper: string }).wrapper = wrapper

  return Object.keys(prelude).length > 0 ? prelude : undefined
}

/**
 * Build a ValidationEnvironmentConfig, only including properties that have values.
 */
function buildEnvConfig(
  env: "bash" | "scala" | "typescript",
  rawPrelude:
    | {
        imports?: string[]
        setup?: string[]
        wrapper?: string
      }
    | undefined,
): ValidationEnvironmentConfig {
  const prelude = buildPrelude(rawPrelude)
  if (prelude) {
    return { environment: env, prelude }
  }
  return { environment: env }
}

/**
 * Build a PairingValidationConfig, only including properties that have values.
 */
function buildPairingConfig(
  env: "bash" | "scala" | "typescript",
  rawPrelude:
    | {
        imports?: string[]
        setup?: string[]
        wrapper?: string
      }
    | undefined,
  rawSecondary:
    | {
        environment?: string
        prelude?: {
          imports?: string[]
          setup?: string[]
          wrapper?: string
        }
      }
    | undefined,
): PairingValidationConfig {
  const prelude = buildPrelude(rawPrelude)
  const secondaryEnv = rawSecondary?.environment

  // Build secondary config if valid environment
  let secondary: ValidationEnvironmentConfig | undefined
  if (secondaryEnv === "bash" || secondaryEnv === "scala" || secondaryEnv === "typescript") {
    secondary = buildEnvConfig(secondaryEnv, rawSecondary?.prelude)
  }

  // Build the config object conditionally to satisfy exactOptionalPropertyTypes
  if (prelude && secondary) {
    return { environment: env, prelude, secondary }
  }
  if (prelude) {
    return { environment: env, prelude }
  }
  if (secondary) {
    return { environment: env, secondary }
  }
  return { environment: env }
}

/**
 * Load and parse step validation config from MDX frontmatter.
 *
 * @param mdxFilePath - Full path to the MDX file
 * @returns Parsed step validation config or null if not configured
 */
export async function loadStepConfig(mdxFilePath: string): Promise<StepValidationConfig | null> {
  const cached = stepConfigCache.get(mdxFilePath)
  if (cached !== undefined) return cached

  let content: string
  try {
    content = await readFile(mdxFilePath, "utf-8")
  } catch {
    stepConfigCache.set(mdxFilePath, null)
    return null
  }

  const { data } = matter(content)
  const raw = data as RawStepFrontmatter

  if (!raw.validation) {
    stepConfigCache.set(mdxFilePath, null)
    return null
  }

  const config = buildStepConfig(
    raw.validation.imports,
    raw.validation.setup,
    raw.validation.wrapper,
  )

  stepConfigCache.set(mdxFilePath, config)
  return config
}

/**
 * Build a StepValidationConfig, only including properties that have values.
 */
function buildStepConfig(
  imports: string[] | undefined,
  setup: string[] | undefined,
  wrapper: string | undefined,
): StepValidationConfig {
  // Build object conditionally to satisfy exactOptionalPropertyTypes
  if (imports && setup && wrapper) {
    return { imports, setup, wrapper }
  }
  if (imports && setup) {
    return { imports, setup }
  }
  if (imports && wrapper) {
    return { imports, wrapper }
  }
  if (setup && wrapper) {
    return { setup, wrapper }
  }
  if (imports) {
    return { imports }
  }
  if (setup) {
    return { setup }
  }
  if (wrapper) {
    return { wrapper }
  }
  return {}
}

/**
 * Resolve the full validation config for a snippet by merging all levels.
 *
 * @param pairingConfig - Pairing-level config from config.yml
 * @param stepConfig - Step-level config from MDX frontmatter
 * @param componentConfig - Component-level config from props
 * @param language - The snippet's programming language (determines which env config to use)
 * @returns Fully resolved validation config
 */
export function resolveConfig(
  pairingConfig: PairingValidationConfig | null,
  stepConfig: StepValidationConfig | null,
  componentConfig: ComponentValidationConfig | null,
  language: "bash" | "scala" | "typescript",
): ResolvedValidationConfig {
  // Check if validation should be skipped
  if (componentConfig?.validate === false) {
    return {
      environment: language,
      imports: [],
      setup: [],
      skip: true,
    }
  }

  // Determine which environment config to use (primary or secondary)
  let envConfig: ValidationEnvironmentConfig | null = null
  if (pairingConfig) {
    if (pairingConfig.environment === language) {
      envConfig = pairingConfig
    } else if (pairingConfig.secondary?.environment === language) {
      envConfig = pairingConfig.secondary
    }
  }

  // Merge imports (concatenate all levels)
  const allImports: string[] = []
  if (envConfig?.prelude?.imports) {
    allImports.push(...envConfig.prelude.imports)
  }
  if (stepConfig?.imports) {
    allImports.push(...stepConfig.imports)
  }
  if (componentConfig?.extraImports) {
    allImports.push(...componentConfig.extraImports)
  }

  // Resolve setup (highest priority wins - component > step > pairing)
  let setup: readonly string[] = []
  if (componentConfig?.setup) {
    setup = componentConfig.setup
  } else if (stepConfig?.setup) {
    setup = stepConfig.setup
  } else if (envConfig?.prelude?.setup) {
    setup = envConfig.prelude.setup
  }

  // Resolve wrapper (highest priority wins)
  let wrapper: string | undefined
  if (stepConfig?.wrapper) {
    wrapper = stepConfig.wrapper
  } else if (envConfig?.prelude?.wrapper) {
    wrapper = envConfig.prelude.wrapper
  }

  // Build return object conditionally to satisfy exactOptionalPropertyTypes
  if (wrapper) {
    return {
      environment: language,
      imports: allImports,
      setup,
      wrapper,
      skip: false,
    }
  }
  return {
    environment: language,
    imports: allImports,
    setup,
    skip: false,
  }
}

/**
 * Clear all config caches. Useful for testing or when configs might have changed.
 */
export function clearConfigCache(): void {
  pairingConfigCache.clear()
  stepConfigCache.clear()
}

/**
 * Resolve validation config for a snippet, loading configs as needed.
 *
 * This is the main entry point for config resolution.
 *
 * @param contentDir - Root content directory
 * @param toolPair - Tool pairing name
 * @param mdxFilePath - Full path to the MDX file
 * @param language - The snippet's programming language
 * @param componentConfig - Optional component-level config from props
 * @returns Fully resolved validation config
 */
export async function resolveSnippetConfig(
  contentDir: string,
  toolPair: string,
  mdxFilePath: string,
  language: "bash" | "scala" | "typescript",
  componentConfig?: ComponentValidationConfig,
): Promise<ResolvedValidationConfig> {
  const pairingConfig = await loadPairingConfig(contentDir, toolPair)
  const stepConfig = await loadStepConfig(mdxFilePath)

  return resolveConfig(pairingConfig, stepConfig, componentConfig ?? null, language)
}
