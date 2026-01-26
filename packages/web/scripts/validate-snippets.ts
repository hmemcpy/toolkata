#!/usr/bin/env bun
/**
 * Snippet Validation CLI - Validates code snippets from MDX content.
 *
 * Usage:
 *   bun run scripts/validate-snippets.ts [options]
 *
 * Options:
 *   --strict          Fail on any error (for CI)
 *   --tool-pair X     Only validate specific tool pair (e.g., jj-git, zio-cats)
 *   --step N          Only validate specific step number
 *   --verbose         Show all output, not just errors
 *   --help            Show this help message
 *
 * Environment Variables:
 *   SANDBOX_API_URL   Sandbox API URL (default: http://localhost:3001)
 *   SANDBOX_API_KEY   Sandbox API key (default: dev-api-key)
 */

import { existsSync } from "node:fs"
import { join, resolve } from "node:path"
import { glob } from "glob"
import { ensureSandboxRunning, type SandboxManager } from "./sandbox-manager.js"
import { extractSnippetsFromToolPair, groupSnippetsByStep } from "./snippet-extractor.js"
import { resolveSnippetConfig, clearConfigCache } from "./config-resolver.js"
import {
  validateStep,
  computeSummary,
  type StepValidationResult,
  type ValidationSummary,
} from "./headless-validator.js"

/**
 * CLI options parsed from command line arguments.
 */
interface CliOptions {
  readonly strict: boolean
  readonly toolPair?: string
  readonly step?: number
  readonly verbose: boolean
  readonly help: boolean
}

/**
 * Parse command line arguments.
 */
function parseArgs(args: string[]): CliOptions {
  let strict = false
  let toolPair: string | undefined
  let step: number | undefined
  let verbose = false
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
      case "--verbose":
        verbose = true
        break
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
  const base = { strict, verbose, help }
  if (toolPair !== undefined && step !== undefined) {
    return { ...base, toolPair, step }
  }
  if (toolPair !== undefined) {
    return { ...base, toolPair }
  }
  if (step !== undefined) {
    return { ...base, step }
  }
  return base
}

/**
 * Print usage information.
 */
function printHelp(): void {
  console.log(`
Snippet Validation CLI - Validates code snippets from MDX content

Usage:
  bun run scripts/validate-snippets.ts [options]

Options:
  --strict          Fail on any error (for CI)
  --tool-pair X     Only validate specific tool pair (e.g., jj-git, zio-cats)
  --step N          Only validate specific step number
  --verbose         Show all output, not just errors
  --help, -h        Show this help message

Environment Variables:
  SANDBOX_API_URL   Sandbox API URL (default: http://localhost:3001)
  SANDBOX_API_KEY   Sandbox API key (default: dev-api-key)

Examples:
  bun run scripts/validate-snippets.ts                    # Validate all
  bun run scripts/validate-snippets.ts --tool-pair jj-git # Validate jj-git only
  bun run scripts/validate-snippets.ts --strict           # Fail build on errors
  bun run scripts/validate-snippets.ts --verbose          # Show detailed output
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

  // Print failures
  for (const snippetResult of result.results) {
    if (snippetResult.status === "fail") {
      const propSuffix = snippetResult.snippet.prop ? `.${snippetResult.snippet.prop}` : ""
      console.log(
        `    \x1b[31m✗\x1b[0m ${snippetResult.snippet.file}:${snippetResult.snippet.lineStart} (${snippetResult.snippet.source}${propSuffix})`,
      )
      console.log(`      Error: ${snippetResult.error}`)
      if (verbose && snippetResult.output) {
        console.log(`      Output: ${snippetResult.output.substring(0, 200)}...`)
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
    console.log(`\n\x1b[31mValidation failed with ${totalFailed} error(s).\x1b[0m`)
  } else {
    console.log("\n\x1b[32mValidation passed!\x1b[0m")
  }
}

/**
 * Validate a single tool pair.
 */
async function validateToolPairFull(
  toolPair: string,
  contentDir: string,
  options: CliOptions,
  sandboxUrl: string,
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

  // Build config map for all steps
  const configs = new Map<number, Awaited<ReturnType<typeof resolveSnippetConfig>>>()
  for (const step of stepsToValidate) {
    const stepSnippets = groupedSnippets.get(step) ?? []
    const firstSnippet = stepSnippets[0]
    if (firstSnippet) {
      // Resolve the full path to the MDX file
      const mdxPath = resolve(contentDir, "..", firstSnippet.file.replace("content/", ""))
      // Normalize "shell" to "bash" for config resolution
      const language: "bash" | "scala" | "typescript" =
        firstSnippet.language === "shell" ? "bash" : firstSnippet.language
      const config = await resolveSnippetConfig(contentDir, toolPair, mdxPath, language)
      configs.set(step, config)
    }
  }

  // Validate each step
  for (const step of stepsToValidate) {
    const stepSnippets = groupedSnippets.get(step) ?? []

    const result = await validateStep(toolPair, step, stepSnippets, configs, {
      sandboxUrl,
      verbose: options.verbose,
    })

    stepResults.push(result)
    printStepResult(result, options.verbose)
  }

  const summary = computeSummary(stepResults)
  return { stepResults, summary }
}

/**
 * Main entry point.
 */
async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    printHelp()
    process.exit(0)
  }

  console.log("=== Snippet Validation ===")

  // Determine content directory (relative to this script)
  const scriptDir = new URL(".", import.meta.url).pathname
  const contentDir = resolve(scriptDir, "..", "content")

  if (!existsSync(contentDir)) {
    console.error(`Error: Content directory not found: ${contentDir}`)
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
      process.exit(1)
    }
    toolPairs = [options.toolPair]
  } else {
    // Discover all tool pairs
    toolPairs = await discoverToolPairs(contentDir)
  }

  if (toolPairs.length === 0) {
    console.log("No tool pairs found to validate.")
    process.exit(0)
  }

  console.log(`Tool pairs: ${toolPairs.join(", ")}`)

  // Ensure sandbox is running
  let sandboxManager: SandboxManager | null = null
  try {
    sandboxManager = await ensureSandboxRunning()
  } catch (err: unknown) {
    console.error(
      `Error: Failed to start sandbox-api: ${err instanceof Error ? err.message : String(err)}`,
    )
    console.error("Make sure Docker is running and the sandbox-api can be started.")
    process.exit(1)
  }

  const allSummaries = new Map<string, ValidationSummary>()

  try {
    // Clear config cache to ensure fresh configs
    clearConfigCache()

    // Validate each tool pair
    for (const toolPair of toolPairs) {
      const { summary } = await validateToolPairFull(
        toolPair,
        contentDir,
        options,
        sandboxManager.url,
      )
      allSummaries.set(toolPair, summary)
    }

    // Print final summary
    printSummary(allSummaries)

    // Check for failures
    let totalFailed = 0
    for (const summary of allSummaries.values()) {
      totalFailed += summary.failed
    }

    // Exit with error code if strict mode and there are failures
    if (options.strict && totalFailed > 0) {
      console.log("\n\x1b[31mBuild failed due to snippet validation errors.\x1b[0m")
      process.exit(1)
    }
  } finally {
    // Clean up sandbox
    if (sandboxManager) {
      await sandboxManager.cleanup()
    }
  }
}

// Run main
main().catch((err: unknown) => {
  console.error("Fatal error:", err instanceof Error ? err.message : String(err))
  process.exit(1)
})
