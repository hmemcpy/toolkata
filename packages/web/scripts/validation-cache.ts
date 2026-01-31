/**
 * Validation Cache - Caches snippet validation results at the step level.
 *
 * Cache key is based on:
 * - config.yml content (pairing-level validation config)
 * - Step MDX file content (frontmatter + snippets)
 *
 * This ensures that any change to the step's content or configuration
 * invalidates the cache and forces re-validation.
 */

import { mkdir, readFile, writeFile, unlink } from "node:fs/promises"
import { join, resolve } from "node:path"
import { createHash } from "node:crypto"
import { existsSync } from "node:fs"

export interface StepCacheEntry {
  readonly stepHash: string
  readonly toolPair: string
  readonly step: number
  readonly result: "pass" | "fail"
  readonly snippetResults: {
    readonly lineStart: number
    readonly result: "pass" | "fail" | "skipped"
    readonly output: string
    readonly error?: string
    readonly durationMs: number
  }[]
  readonly timestamp: number
}

export interface CacheLookupResult {
  readonly hit: boolean
  readonly entry?: StepCacheEntry
}

const CACHE_VERSION = "1"
const CACHE_DIR_NAME = ".validation-cache"

/**
 * Get the cache directory path.
 */
export function getCacheDir(scriptsDir: string): string {
  return resolve(scriptsDir, "..", CACHE_DIR_NAME)
}

/**
 * Ensure the cache directory exists.
 */
export async function ensureCacheDir(scriptsDir: string): Promise<void> {
  const cacheDir = getCacheDir(scriptsDir)
  if (!existsSync(cacheDir)) {
    await mkdir(cacheDir, { recursive: true })
  }
}

/**
 * Compute SHA256 hash of step content for cache key.
 */
export async function computeStepHash(
  scriptsDir: string,
  toolPair: string,
  step: number,
): Promise<string> {
  const contentDir = resolve(scriptsDir, "..", "content")

  // Read config.yml
  const configPath = join(contentDir, "comparisons", toolPair, "config.yml")
  const configContent = await readFile(configPath, "utf-8")

  // Read step MDX file
  const stepFileName = `${step.toString().padStart(2, "0")}-step.mdx`
  const stepPath = join(contentDir, "comparisons", toolPair, stepFileName)
  const stepContent = await readFile(stepPath, "utf-8")

  // Include cache version in hash (allows cache invalidation on format changes)
  const combined = `${CACHE_VERSION}:${configContent}:${stepContent}`
  return createHash("sha256").update(combined).digest("hex")
}

/**
 * Get cache file path for a specific step.
 */
function getCacheFilePath(cacheDir: string, toolPair: string, step: number): string {
  return join(cacheDir, `${toolPair}-step-${step}.json`)
}

/**
 * Load cached validation result for a step.
 */
export async function loadCacheEntry(
  scriptsDir: string,
  toolPair: string,
  step: number,
): Promise<CacheLookupResult> {
  const cacheDir = getCacheDir(scriptsDir)
  const cacheFilePath = getCacheFilePath(cacheDir, toolPair, step)

  if (!existsSync(cacheFilePath)) {
    return { hit: false }
  }

  try {
    const content = await readFile(cacheFilePath, "utf-8")
    const entry: StepCacheEntry = JSON.parse(content)

    // Verify the hash matches (sanity check)
    const currentHash = await computeStepHash(scriptsDir, toolPair, step)
    if (entry.stepHash !== currentHash) {
      // Hash mismatch - stale cache
      return { hit: false }
    }

    return { hit: true, entry }
  } catch {
    // Invalid cache file - treat as miss
    return { hit: false }
  }
}

/**
 * Save validation result for a step.
 */
export async function saveCacheEntry(scriptsDir: string, entry: StepCacheEntry): Promise<void> {
  const cacheDir = getCacheDir(scriptsDir)
  await ensureCacheDir(scriptsDir)

  const cacheFilePath = getCacheFilePath(cacheDir, entry.toolPair, entry.step)
  await writeFile(cacheFilePath, JSON.stringify(entry, null, 2), "utf-8")
}

/**
 * Clear all cache entries for a specific tool pair.
 */
export async function clearToolPairCache(scriptsDir: string, toolPair: string): Promise<void> {
  const cacheDir = getCacheDir(scriptsDir)
  if (!existsSync(cacheDir)) return

  const pattern = new RegExp(`^${toolPair}-step-\\d+\\.json$`)
  const { readdir } = await import("node:fs/promises")
  const files = await readdir(cacheDir)

  for (const file of files) {
    if (pattern.test(file)) {
      await unlink(join(cacheDir, file))
    }
  }
}

/**
 * Clear all cache entries.
 */
export async function clearAllCache(scriptsDir: string): Promise<void> {
  const cacheDir = getCacheDir(scriptsDir)
  if (!existsSync(cacheDir)) return

  const { rm } = await import("node:fs/promises")
  await rm(cacheDir, { recursive: true, force: true })
}
