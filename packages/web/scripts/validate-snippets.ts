#!/usr/bin/env bun
/**
 * Snippet Validation CLI - Validates code snippets from MDX content.
 *
 * Uses isolated Docker containers for each snippet validation.
 *
 * Usage:
 *   bun run scripts/validate-snippets.ts [options]
 *
 * Options:
 *   --strict          Fail on any error (for CI)
 *   --tool-pair X     Only validate specific tool pair (e.g., jj-git, zio-cats)
 *   --step N          Only validate specific step number
 *   --parallel        Run snippets in parallel (faster, but harder to debug)
 *   --verbose         Show all output, not just errors
 *   --output-json X   Output JSON report to file (for CI artifact storage)
 *   --help            Show this help message
 */

import { existsSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import type { EventEmitter } from "node:events"
import { glob } from "glob"
import { extractSnippetsFromToolPair, groupSnippetsByStep } from "./snippet-extractor.js"
import { resolveSnippetConfig, clearConfigCache } from "./config-resolver.js"
import {
  validateStep,
  computeSummary,
  type StepValidationResult,
  type ValidationSummary,
} from "./docker-validator.js"
import {
  loadCacheEntry,
  saveCacheEntry,
  clearAllCache,
  type StepCacheEntry,
} from "./validation-cache.js"

/**
 * CLI options parsed from command line arguments.
 */
interface CliOptions {
  readonly strict: boolean
  readonly toolPair?: string
  readonly step?: number
  readonly parallel: boolean
  readonly verbose: boolean
  readonly noCache: boolean
  readonly clearCache: boolean
  readonly outputJson?: string
  readonly help: boolean
}

/**
 * Parse command line arguments.
 */
function parseArgs(args: string[]): CliOptions {
  let strict = false
  let toolPair: string | undefined
  let step: number | undefined
  let parallel = false
  let verbose = false
  let noCache = false
  let clearCache = false
  let outputJson: string | undefined
  let help = false

  const iter = args[Symbol.iterator]()
  let next = iter.next()

  while (!next.done) {
    const arg = next.value

    switch (arg) {
      case "--strict":
        strict = true
        break
      case "--tool-pair": {
        next = iter.next()
        toolPair = next.value
        break
      }
      case "--step": {
        next = iter.next()
        step = Number.parseInt(next.value ?? "", 10)
        if (Number.isNaN(step)) {
          console.error("Error: --step requires a valid number")
          process.exit(1)
        }
        break
      }
      case "--parallel":
        parallel = true
        break
      case "--verbose":
        verbose = true
        break
      case "--no-cache":
        noCache = true
        break
      case "--clear-cache":
        clearCache = true
        break
      case "--output-json": {
        next = iter.next()
        outputJson = next.value
        if (!outputJson) {
          console.error("Error: --output-json requires a file path")
          process.exit(1)
        }
        break
      }
      case "--help":
      case "-h":
        help = true
        break
      default:
        if (arg.startsWith("-")) {
          console.error(`Unknown option: ${arg}`)
          console.error("Use --help for usage information")
          process.exit(1)
        }
    }
    next = iter.next()
  }

  // Build return object conditionally to satisfy exactOptionalPropertyTypes
  const base = { strict, parallel, verbose, noCache, clearCache, help }

  // Build result object with only defined optional properties
  let result: CliOptions = base
  if (toolPair !== undefined) {
    result = { ...result, toolPair }
  }
  if (step !== undefined) {
    result = { ...result, step }
  }
  if (outputJson !== undefined) {
    result = { ...result, outputJson }
  }
  return result
}

/**
 * Print usage information.
 */
function printHelp(): void {
  console.log(`
Snippet Validation CLI - Validates code snippets from MDX content

Uses isolated Docker containers for each snippet validation.

Usage:
  bun run scripts/validate-snippets.ts [options]

Options:
  --strict          Fail on any error (for CI)
  --tool-pair X     Only validate specific tool pair (e.g., jj-git, zio-cats)
  --step N          Only validate specific step number
  --parallel        Run snippets in parallel (faster, but harder to debug)
  --verbose         Show all output, not just errors
  --no-cache        Force re-validation ignoring cache
  --clear-cache     Clear all cached validation results
  --output-json X   Output JSON report to file (for CI artifact storage)
  --help, -h        Show this help message

Prerequisites:
  - Docker must be running
  - Docker image 'toolkata-env:bash' must be built
    (run: bun run --cwd packages/sandbox-api docker:build)

Examples:
  bun run scripts/validate-snippets.ts                    # Validate all
  bun run scripts/validate-snippets.ts --tool-pair jj-git # Validate jj-git only
  bun run scripts/validate-snippets.ts --parallel         # Run in parallel (faster)
  bun run scripts/validate-snippets.ts --strict           # Fail build on errors
  bun run scripts/validate-snippets.ts --verbose          # Show detailed output
  bun run scripts/validate-snippets.ts --no-cache         # Skip cache, revalidate all
  bun run scripts/validate-snippets.ts --clear-cache      # Clear cache only
  bun run scripts/validate-snippets.ts --output-json report.json  # Output JSON report
`)
}

/**
 * Discover all tool pairs in the content directory.
 */
async function discoverToolPairs(contentDir: string): Promise<string[]> {
  const pattern = join(contentDir, "comparisons", "*", "config.yml")
  const configFiles = await glob(pattern)
  return configFiles.map((f) => f.split("/").slice(-2, -1)[0] ?? "").filter(Boolean)
}

/**
 * Format duration in human readable format.
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  }
  return `${(ms / 1000).toFixed(1)}s`
}

/**
 * Print a step's validation results.
 */
function printStepResult(result: StepValidationResult, verbose: boolean): void {
  const passCount = result.results.filter((r) => r.status === "pass").length
  const failCount = result.results.filter((r) => r.status === "fail").length
  const skipCount = result.results.filter((r) => r.status === "skipped").length
  const total = result.results.length

  // Determine status indicator
  let statusIndicator: string
  if (failCount > 0) {
    statusIndicator = "\x1b[31m✗\x1b[0m" // Red X
  } else if (passCount > 0) {
    statusIndicator = "\x1b[32m✓\x1b[0m" // Green checkmark
  } else {
    statusIndicator = "\x1b[33m-\x1b[0m" // Yellow dash (all skipped)
  }

  // Build counts string
  const counts: string[] = []
  if (passCount > 0) counts.push(`\x1b[32m${passCount} passed\x1b[0m`)
  if (failCount > 0) counts.push(`\x1b[31m${failCount} failed\x1b[0m`)
  if (skipCount > 0) counts.push(`\x1b[33m${skipCount} skipped\x1b[0m`)

  const countsStr = counts.length > 0 ? counts.join(", ") : `${total} total`

  console.log(
    `  ${statusIndicator} Step ${result.step}: ${countsStr} (${formatDuration(result.totalDurationMs)})`,
  )

  // Print failures with full context
  for (const snippetResult of result.results) {
    if (snippetResult.status === "fail") {
      const propSuffix = snippetResult.snippet.prop ? `.${snippetResult.snippet.prop}` : ""
      console.log(
        `    \x1b[31m✗\x1b[0m ${snippetResult.snippet.file}:${snippetResult.snippet.lineStart} (${snippetResult.snippet.source}${propSuffix})`,
      )

      // Show the command/code that was executed (truncated if too long)
      const codePreview = snippetResult.snippet.code.split("\n")[0]?.substring(0, 80) ?? ""
      const codeSuffix = snippetResult.snippet.code.length > 80 || snippetResult.snippet.code.includes("\n") ? "..." : ""
      console.log(`      Code: ${codePreview}${codeSuffix}`)

      // Show the error
      console.log(`      \x1b[31mError:\x1b[0m ${snippetResult.error}`)

      // Always show output for failures (helps debugging)
      if (snippetResult.output) {
        const outputLines = snippetResult.output.trim().split("\n")
        if (outputLines.length === 1) {
          console.log(`      Output: ${outputLines[0]}`)
        } else if (outputLines.length > 0) {
          console.log("      Output:")
          // Show up to 10 lines of output
          const maxLines = verbose ? outputLines.length : Math.min(10, outputLines.length)
          for (let i = 0; i < maxLines; i++) {
            console.log(`        ${outputLines[i]}`)
          }
          if (!verbose && outputLines.length > 10) {
            console.log(`        ... (${outputLines.length - 10} more lines, use --verbose to see all)`)
          }
        }
      }
    }
  }
}

/**
 * Print summary of all validation results.
 */
function printSummary(summaries: Map<string, ValidationSummary>): void {
  console.log("\n=== Summary ===\n")

  let totalSnippets = 0
  let totalPassed = 0
  let totalFailed = 0
  let totalSkipped = 0
  let totalDuration = 0

  for (const [toolPair, summary] of summaries) {
    console.log(`${toolPair}:`)
    console.log(`  Snippets: ${summary.totalSnippets}`)
    console.log(
      `  Passed: \x1b[32m${summary.passed}\x1b[0m, Failed: \x1b[31m${summary.failed}\x1b[0m, Skipped: \x1b[33m${summary.skipped}\x1b[0m`,
    )
    console.log(`  Duration: ${formatDuration(summary.totalDurationMs)}`)

    totalSnippets += summary.totalSnippets
    totalPassed += summary.passed
    totalFailed += summary.failed
    totalSkipped += summary.skipped
    totalDuration += summary.totalDurationMs
  }

  console.log("\n---")
  console.log(`Total: ${totalSnippets} snippets`)
  console.log(
    `Passed: \x1b[32m${totalPassed}\x1b[0m, Failed: \x1b[31m${totalFailed}\x1b[0m, Skipped: \x1b[33m${totalSkipped}\x1b[0m`,
  )
  console.log(`Total duration: ${formatDuration(totalDuration)}`)

  if (totalFailed > 0) {
    // Collect all failures across tool pairs for a consolidated report
    const allFailures: Array<{ toolPair: string; failure: ValidationSummary["failures"][number] }> = []
    for (const [toolPair, summary] of summaries) {
      for (const failure of summary.failures) {
        allFailures.push({ toolPair, failure })
      }
    }

    console.log(`\n\x1b[31m=== ${totalFailed} Failure(s) ===\x1b[0m\n`)
    for (const { toolPair, failure } of allFailures) {
      const propSuffix = failure.prop ? `.${failure.prop}` : ""
      console.log(`\x1b[31m✗\x1b[0m ${failure.file}:${failure.lineStart} (${failure.source}${propSuffix})`)
      console.log(`  Tool pair: ${toolPair}`)

      // Show the code (first line + indicator if multiline)
      const codeLines = failure.code.split("\n")
      if (codeLines.length === 1) {
        console.log(`  Code: ${codeLines[0]}`)
      } else {
        console.log(`  Code: ${codeLines[0]}`)
        const indent = "        "
        for (let i = 1; i < Math.min(5, codeLines.length); i++) {
          console.log(`${indent}${codeLines[i]}`)
        }
        if (codeLines.length > 5) {
          console.log(`${indent}... (${codeLines.length - 5} more lines)`)
        }
      }

      console.log(`  \x1b[31mError:\x1b[0m ${failure.error}`)

      // Show output if available (truncated for summary)
      if (failure.output) {
        const outputLines = failure.output.trim().split("\n")
        if (outputLines.length <= 3) {
          for (const line of outputLines) {
            console.log(`  Output: ${line}`)
          }
        } else {
          console.log(`  Output: ${outputLines[0]}`)
          console.log(`          ${outputLines[1]}`)
          console.log(`          ... (${outputLines.length - 2} more lines)`)
        }
      }
      console.log("")
    }

    console.log(`\x1b[31mValidation failed with ${totalFailed} error(s).\x1b[0m`)
  } else {
    console.log("\n\x1b[32mValidation passed!\x1b[0m")
  }
}

/**
 * JSON report structure for validation results.
 */
interface ValidationReport {
  readonly timestamp: string
  readonly version: string
  readonly success: boolean
  readonly summary: {
    readonly totalSnippets: number
    readonly passed: number
    readonly failed: number
    readonly skipped: number
    readonly totalDurationMs: number
  }
  readonly toolPairs: readonly {
    readonly name: string
    readonly summary: {
      readonly totalSnippets: number
      readonly passed: number
      readonly failed: number
      readonly skipped: number
      readonly totalDurationMs: number
    }
    readonly failures: readonly {
      readonly file: string
      readonly lineStart: number
      readonly source: string
      readonly prop?: string
      readonly code: string
      readonly error: string
      readonly output: string
    }[]
  }[]
}

/**
 * Generate a JSON report from validation summaries.
 */
function generateJsonReport(summaries: Map<string, ValidationSummary>): ValidationReport {
  let totalSnippets = 0
  let totalPassed = 0
  let totalFailed = 0
  let totalSkipped = 0
  let totalDuration = 0

  const toolPairs: ValidationReport["toolPairs"][number][] = []

  for (const [name, summary] of summaries) {
    totalSnippets += summary.totalSnippets
    totalPassed += summary.passed
    totalFailed += summary.failed
    totalSkipped += summary.skipped
    totalDuration += summary.totalDurationMs

    toolPairs.push({
      name,
      summary: {
        totalSnippets: summary.totalSnippets,
        passed: summary.passed,
        failed: summary.failed,
        skipped: summary.skipped,
        totalDurationMs: summary.totalDurationMs,
      },
      failures: summary.failures,
    })
  }

  return {
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    success: totalFailed === 0,
    summary: {
      totalSnippets,
      passed: totalPassed,
      failed: totalFailed,
      skipped: totalSkipped,
      totalDurationMs: totalDuration,
    },
    toolPairs,
  }
}

/**
 * Write JSON report to a file.
 */
function writeJsonReport(summaries: Map<string, ValidationSummary>, filePath: string): void {
  const report = generateJsonReport(summaries)
  const json = JSON.stringify(report, null, 2)
  writeFileSync(filePath, json, "utf-8")
  console.log(`\nJSON report written to: ${filePath}`)
}

/**
 * Validate a single tool pair.
 */
async function validateToolPairFull(
  toolPair: string,
  contentDir: string,
  scriptDir: string,
  options: CliOptions,
): Promise<{ stepResults: StepValidationResult[]; summary: ValidationSummary }> {
  console.log(`\nValidating ${toolPair}...`)

  // Extract snippets
  const snippets = await extractSnippetsFromToolPair(contentDir, toolPair)
  if (snippets.length === 0) {
    console.log(`  No snippets found for ${toolPair}`)
    return {
      stepResults: [],
      summary: {
        totalSnippets: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        totalDurationMs: 0,
        failures: [],
      },
    }
  }

  console.log(`  Found ${snippets.length} snippets`)

  // Group by step
  const groupedSnippets = groupSnippetsByStep(snippets)
  const sortedSteps = [...groupedSnippets.keys()].sort((a, b) => a - b)

  // Filter to specific step if requested
  const stepsToValidate = options.step ? sortedSteps.filter((s) => s === options.step) : sortedSteps

  if (options.step && stepsToValidate.length === 0) {
    console.log(`  Step ${options.step} not found in ${toolPair}`)
    return {
      stepResults: [],
      summary: {
        totalSnippets: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        totalDurationMs: 0,
        failures: [],
      },
    }
  }

  const stepResults: StepValidationResult[] = []

  // Validate each step
  for (const step of stepsToValidate) {
    const stepSnippets = groupedSnippets.get(step) ?? []
    const firstSnippet = stepSnippets[0]

    if (!firstSnippet) continue

    let result: StepValidationResult

    // Check cache unless --no-cache is specified
    if (!options.noCache) {
      const cacheLookup = await loadCacheEntry(scriptDir, toolPair, step)
      if (cacheLookup.hit && cacheLookup.entry) {
        // Cache hit - reconstruct StepValidationResult from cache
        const cachedResult = cacheLookup.entry
        result = {
          step,
          toolPair,
          results: cachedResult.snippetResults.map((sr) => {
            const base = {
              snippet: firstSnippet, // Use first snippet as reference
              status: sr.result,
              output: sr.output,
              durationMs: sr.durationMs,
            }
            // Only add error if defined (exactOptionalPropertyTypes)
            if (sr.error !== undefined) {
              return { ...base, error: sr.error }
            }
            return base
          }),
          totalDurationMs: 0, // Cached results don't track total duration
        }

        const passCount = result.results.filter((r) => r.status === "pass").length
        const failCount = result.results.filter((r) => r.status === "fail").length
        const skipCount = result.results.filter((r) => r.status === "skipped").length

        console.log(`  \x1b[90m⊝ Cache hit\x1b[0m Step ${step}: ${passCount} passed, ${failCount} failed, ${skipCount} skipped`)
        stepResults.push(result)
        continue
      }
    }

    // Resolve the full path to the MDX file
    // firstSnippet.file is like "content/comparisons/jj-git/04-step.mdx"
    // contentDir is like "packages/web/content"
    // So we need to strip the "content/" prefix
    const mdxPath = resolve(contentDir, firstSnippet.file.replace(/^content\//, ""))
    // Normalize "shell" to "bash" for config resolution
    const language: "bash" | "scala" | "typescript" =
      firstSnippet.language === "shell" ? "bash" : firstSnippet.language
    const config = await resolveSnippetConfig(contentDir, toolPair, mdxPath, language)

    result = await validateStep(toolPair, step, stepSnippets, config, {
      verbose: options.verbose,
      parallel: options.parallel,
      maxParallel: 4,
    })

    // Save to cache
    if (!options.noCache) {
      const { computeStepHash } = await import("./validation-cache.js")
      const stepHash = await computeStepHash(scriptDir, toolPair, step)

      // Determine overall result (fail if any snippet failed)
      const hasFailures = result.results.some((r) => r.status === "fail")
      const overallResult: "pass" | "fail" = hasFailures ? "fail" : "pass"

      const cacheEntry: StepCacheEntry = {
        stepHash,
        toolPair,
        step,
        result: overallResult,
        snippetResults: result.results.map((sr) => {
          const base = {
            lineStart: sr.snippet.lineStart,
            result: sr.status,
            output: sr.output,
            durationMs: sr.durationMs,
          }
          // Only add error if defined (exactOptionalPropertyTypes)
          if (sr.error !== undefined) {
            return { ...base, error: sr.error }
          }
          return base
        }),
        timestamp: Date.now(),
      }

      await saveCacheEntry(scriptDir, cacheEntry)
    }

    stepResults.push(result)
    printStepResult(result, options.verbose)
  }

  const summary = computeSummary(stepResults)
  return { stepResults, summary }
}

/**
 * Check if Docker is available and the image exists.
 * Checks both bash and scala images.
 */
async function checkDockerPrerequisites(toolPairs: string[]): Promise<{ ok: boolean; missing: string[] }> {
  const { spawn } = await import("node:child_process")

  const images = new Set<string>(["toolkata-env:bash"])

  // Add scala image if zio-cats or effect-zio is being validated
  for (const toolPair of toolPairs) {
    if (toolPair === "zio-cats" || toolPair === "effect-zio") {
      images.add("toolkata-env:scala")
      break
    }
  }

  const missing: string[] = []
  let ok = true

  // Check each required image
  for (const image of images) {
    const exists = await new Promise<boolean>((resolve) => {
      const proc = spawn("docker", ["image", "inspect", image], {
        stdio: ["ignore", "pipe", "pipe"],
      })

      // Cast to EventEmitter to access event methods
      const emitter = proc as unknown as EventEmitter & { kill(signal?: NodeJS.Signals): void }
      emitter.on("close", (code: number | null) => {
        resolve(code === 0)
      })

      emitter.on("error", () => {
        resolve(false)
      })
    })

    if (!exists) {
      ok = false
      missing.push(image)
    }
  }

  return { ok, missing }
}

// Script-level timeout (5 minutes for full validation)
const SCRIPT_TIMEOUT_MS = 5 * 60 * 1000

/**
 * Main entry point.
 */
async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    printHelp()
    process.exit(0)
  }

  // Set up script-level timeout
  const timeoutId = setTimeout(() => {
    console.error("\n\x1b[31mScript timeout: validation took too long (5 minutes max)\x1b[0m")
    process.exit(124) // Standard timeout exit code
  }, SCRIPT_TIMEOUT_MS)

  // Ensure timeout doesn't keep process alive
  timeoutId.unref()

  console.log("=== Snippet Validation ===")

  // Determine content directory (relative to this script)
  const scriptDir = new URL(".", import.meta.url).pathname

  // Handle --clear-cache flag (exits after clearing)
  if (options.clearCache) {
    console.log("Clearing validation cache...")
    await clearAllCache(scriptDir)
    console.log("Cache cleared.")
    clearTimeout(timeoutId)
    process.exit(0)
  }

  const contentDir = resolve(scriptDir, "..", "content")

  if (!existsSync(contentDir)) {
    console.error(`Error: Content directory not found: ${contentDir}`)
    clearTimeout(timeoutId)
    process.exit(1)
  }

  // Discover tool pairs to validate
  let toolPairs: string[]
  if (options.toolPair) {
    // Validate specific tool pair
    const configPath = join(contentDir, "comparisons", options.toolPair, "config.yml")
    if (!existsSync(configPath)) {
      console.error(`Error: Tool pair not found: ${options.toolPair}`)
      console.error(`Expected config at: ${configPath}`)
      clearTimeout(timeoutId)
      process.exit(1)
    }
    toolPairs = [options.toolPair]
  } else {
    // Discover all tool pairs
    toolPairs = await discoverToolPairs(contentDir)
  }

  if (toolPairs.length === 0) {
    console.log("No tool pairs found to validate.")
    clearTimeout(timeoutId)
    process.exit(0)
  }

  // Check Docker prerequisites (after we know which tool pairs to validate)
  const dockerCheck = await checkDockerPrerequisites(toolPairs)
  if (!dockerCheck.ok) {
    console.error(`Error: Required Docker image(s) not found: ${dockerCheck.missing.join(", ")}`)
    console.error("Build missing images with: bun run --cwd packages/sandbox-api docker:build")
    clearTimeout(timeoutId)
    process.exit(1)
  }

  console.log(`Tool pairs: ${toolPairs.join(", ")}`)
  if (options.parallel) {
    console.log("Mode: parallel (4 concurrent containers)")
  }

  const allSummaries = new Map<string, ValidationSummary>()

  // Set up signal handlers for graceful cleanup
  process.on("SIGINT", () => {
    console.log("\nReceived SIGINT, exiting...")
    clearTimeout(timeoutId)
    process.exit(130)
  })

  process.on("SIGTERM", () => {
    console.log("\nReceived SIGTERM, exiting...")
    clearTimeout(timeoutId)
    process.exit(143)
  })

  try {
    // Clear config cache to ensure fresh configs
    clearConfigCache()

    // Validate each tool pair
    for (const toolPair of toolPairs) {
      const { summary } = await validateToolPairFull(toolPair, contentDir, scriptDir, options)
      allSummaries.set(toolPair, summary)
    }

    // Print final summary
    printSummary(allSummaries)

    // Write JSON report if requested
    if (options.outputJson) {
      writeJsonReport(allSummaries, options.outputJson)
    }

    // Check for failures
    let totalFailed = 0
    for (const summary of allSummaries.values()) {
      totalFailed += summary.failed
    }

    // Exit with error code if strict mode and there are failures
    if (options.strict && totalFailed > 0) {
      console.log("\n\x1b[31mBuild failed due to snippet validation errors.\x1b[0m")
      clearTimeout(timeoutId)
      process.exit(1)
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

// Run main
main().catch((err: unknown) => {
  console.error("Fatal error:", err instanceof Error ? err.message : String(err))
  process.exit(1)
})
