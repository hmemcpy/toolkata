/**
 * Docker CLI-based Snippet Validator
 *
 * Runs each snippet in an isolated container using Docker CLI.
 * Benefits:
 * - No session/state management
 * - Direct command execution via docker exec
 * - Clean stdout/stderr/exitCode
 * - Can run in parallel
 */

import { spawn } from "node:child_process"
import { randomUUID } from "node:crypto"
import type { ExtractedSnippet } from "./snippet-extractor.js"
import { isPseudoCode } from "./snippet-extractor.js"
import type { ResolvedValidationConfig } from "./config-resolver.js"

// Use our existing bash environment image
const DOCKER_IMAGE = "toolkata-env:bash"

/**
 * Result of validating a single snippet.
 */
export interface SnippetValidationResult {
  readonly snippet: ExtractedSnippet
  readonly status: "pass" | "fail" | "skipped"
  readonly output: string
  readonly error?: string
  readonly durationMs: number
}

/**
 * Result of validating an entire step.
 */
export interface StepValidationResult {
  readonly step: number
  readonly toolPair: string
  readonly results: readonly SnippetValidationResult[]
  readonly totalDurationMs: number
}

/**
 * Options for the validator.
 */
export interface ValidatorOptions {
  readonly verbose?: boolean
  readonly parallel?: boolean
  readonly maxParallel?: number
}

/**
 * Check if a snippet is a non-executable command (documentation-only).
 */
function isNonExecutableCommand(code: string): boolean {
  const trimmed = code.trim()

  // Interactive editors
  if (/^(vim|vi|nano|emacs|code|subl)\s/.test(trimmed)) return true

  // cd to non-existent directory
  if (/^cd\s+\w+$/.test(trimmed) && !/^cd\s+(\/|~|\.)/.test(trimmed)) return true

  // Placeholders
  if (/\{[^}]+\}/.test(trimmed)) return true
  if (/<[^>]+>/.test(trimmed) && !trimmed.startsWith("jj log")) return true

  // URL-based commands
  if (/https?:\/\//.test(trimmed)) return true

  // Diagram-style text (not actual commands)
  // e.g., "[Working Copy] → [Staging] → [Repository]"
  if (/^\[.+\]\s*→/.test(trimmed)) return true

  // Git commands that reference specific files (documentation examples)
  // These reference files that don't exist in the sandbox
  if (/^git\s+(add|diff|rm|checkout|restore)\s+\S+\.(ts|js|tsx|jsx|py|rb|go|rs|java|cpp|c|h|css|html|json|yml|yaml|md|txt)/.test(trimmed)) {
    return true
  }

  // Git commit with nothing to commit (requires staged changes)
  // Skip git commit commands in SideBySide since they require prior staging
  if (/^git\s+commit\s+-m\s+/.test(trimmed)) {
    return true
  }

  return false
}

/**
 * Error patterns that indicate validation failure for shell commands.
 */
const SHELL_ERROR_PATTERNS = [
  /^error:/im,
  /^fatal:/im,
  /^usage:/im,
  /command not found/i,
  /no such file or directory/i,
  /permission denied/i,
]

/**
 * Check if shell output indicates an error.
 */
function detectShellError(output: string): string | null {
  for (const pattern of SHELL_ERROR_PATTERNS) {
    if (pattern.test(output)) {
      const lines = output.split("\n")
      for (const line of lines) {
        if (pattern.test(line)) {
          return line.trim()
        }
      }
      return "Error detected in output"
    }
  }
  return null
}

/**
 * Run a command and return stdout, stderr, and exit code.
 */
function runCommand(
  command: string,
  args: string[],
  timeoutMs = 30000,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { shell: false })
    let stdout = ""
    let stderr = ""

    const timeout = setTimeout(() => {
      proc.kill("SIGKILL")
      resolve({ stdout, stderr: `${stderr}\nCommand timed out`, exitCode: 124 })
    }, timeoutMs)

    proc.stdout.on("data", (data) => {
      stdout += data.toString()
    })

    proc.stderr.on("data", (data) => {
      stderr += data.toString()
    })

    proc.on("close", (code) => {
      clearTimeout(timeout)
      resolve({ stdout, stderr, exitCode: code ?? 1 })
    })

    proc.on("error", (err) => {
      clearTimeout(timeout)
      resolve({ stdout, stderr: err.message, exitCode: 1 })
    })
  })
}

/**
 * Create and start a container, returning its ID.
 */
async function createContainer(name: string): Promise<string | null> {
  const result = await runCommand("docker", [
    "run",
    "-d",
    "--name",
    name,
    "--user",
    "sandbox",
    "--workdir",
    "/home/sandbox",
    DOCKER_IMAGE,
    "sleep",
    "infinity",
  ])

  if (result.exitCode !== 0) {
    return null
  }

  return result.stdout.trim()
}

/**
 * Execute a command in a container.
 */
async function execInContainer(
  containerName: string,
  command: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return runCommand("docker", [
    "exec",
    "--user",
    "sandbox",
    "--workdir",
    "/home/sandbox",
    containerName,
    "bash",
    "-c",
    command,
  ])
}

/**
 * Stop and remove a container.
 */
async function removeContainer(containerName: string): Promise<void> {
  await runCommand("docker", ["rm", "-f", containerName])
}

/**
 * Validate a single snippet in an isolated container.
 */
async function validateSnippetInContainer(
  snippet: ExtractedSnippet,
  config: ResolvedValidationConfig,
  verbose: boolean,
): Promise<SnippetValidationResult> {
  const startTime = Date.now()

  // Check if validation should be skipped
  if (snippet.validate === false || config.skip) {
    return {
      snippet,
      status: "skipped",
      output: "",
      durationMs: Date.now() - startTime,
    }
  }

  // Skip pseudo-code
  if (isPseudoCode(snippet.code)) {
    return {
      snippet,
      status: "skipped",
      output: "Pseudo-code detected",
      durationMs: Date.now() - startTime,
    }
  }

  // Skip non-executable commands
  if (isNonExecutableCommand(snippet.code)) {
    return {
      snippet,
      status: "skipped",
      output: "Non-executable command (documentation only)",
      durationMs: Date.now() - startTime,
    }
  }

  // Only handle bash/shell
  if (snippet.language !== "bash" && snippet.language !== "shell") {
    return {
      snippet,
      status: "skipped",
      output: `Validation for ${snippet.language} not yet implemented`,
      durationMs: Date.now() - startTime,
    }
  }

  const containerName = `toolkata-validate-${randomUUID().slice(0, 8)}`

  try {
    if (verbose) {
      console.log(`[Docker] Starting container ${containerName} for: ${snippet.code.substring(0, 40)}...`)
    }

    // Start container
    const containerId = await createContainer(containerName)
    if (!containerId) {
      return {
        snippet,
        status: "fail",
        output: "",
        error: "Failed to create container",
        durationMs: Date.now() - startTime,
      }
    }

    // Run setup commands
    for (const setupCmd of config.setup) {
      if (verbose) {
        console.log(`[Docker] Setup: ${setupCmd}`)
      }
      const result = await execInContainer(containerName, setupCmd)

      if (result.exitCode !== 0) {
        return {
          snippet,
          status: "fail",
          output: result.stdout,
          error: `Setup failed: ${result.stderr || result.stdout}`,
          durationMs: Date.now() - startTime,
        }
      }
    }

    // Run the actual snippet command
    if (verbose) {
      console.log(`[Docker] Executing: ${snippet.code}`)
    }

    const result = await execInContainer(containerName, snippet.code)

    // Check exit code first
    if (result.exitCode !== 0) {
      return {
        snippet,
        status: "fail",
        output: result.stdout,
        error: result.stderr || `Exit code: ${result.exitCode}`,
        durationMs: Date.now() - startTime,
      }
    }

    // Check for error patterns in output
    const errorMsg = detectShellError(result.stdout + result.stderr)
    if (errorMsg) {
      return {
        snippet,
        status: "fail",
        output: result.stdout,
        error: errorMsg,
        durationMs: Date.now() - startTime,
      }
    }

    return {
      snippet,
      status: "pass",
      output: result.stdout,
      durationMs: Date.now() - startTime,
    }
  } catch (err: unknown) {
    return {
      snippet,
      status: "fail",
      output: "",
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - startTime,
    }
  } finally {
    // Always stop and remove the container
    await removeContainer(containerName)
  }
}

/**
 * Validate snippets in parallel with concurrency limit.
 */
async function validateInParallel<T, R>(
  items: readonly T[],
  fn: (item: T) => Promise<R>,
  maxConcurrency: number,
): Promise<R[]> {
  const results: R[] = []
  const executing: Set<Promise<void>> = new Set()

  for (const item of items) {
    const promise = (async () => {
      const result = await fn(item)
      results.push(result)
    })()

    executing.add(promise)
    promise.finally(() => executing.delete(promise))

    if (executing.size >= maxConcurrency) {
      await Promise.race(executing)
    }
  }

  await Promise.all(executing)
  return results
}

/**
 * Validate all snippets for a single step.
 */
export async function validateStep(
  toolPair: string,
  step: number,
  snippets: readonly ExtractedSnippet[],
  config: ResolvedValidationConfig,
  options: ValidatorOptions = {},
): Promise<StepValidationResult> {
  const startTime = Date.now()
  const verbose = options.verbose ?? false
  const parallel = options.parallel ?? false
  const maxParallel = options.maxParallel ?? 4

  if (snippets.length === 0) {
    return {
      step,
      toolPair,
      results: [],
      totalDurationMs: Date.now() - startTime,
    }
  }

  let results: SnippetValidationResult[]

  if (parallel) {
    // Run in parallel with concurrency limit
    results = await validateInParallel(
      snippets,
      (snippet) => validateSnippetInContainer(snippet, config, verbose),
      maxParallel,
    )
  } else {
    // Run sequentially
    results = []
    for (const snippet of snippets) {
      const result = await validateSnippetInContainer(snippet, config, verbose)
      results.push(result)

      if (verbose) {
        const icon = result.status === "pass" ? "+" : result.status === "fail" ? "x" : "-"
        console.log(`  [${icon}] ${snippet.file}:${snippet.lineStart} (${snippet.source})`)
      }
    }
  }

  return {
    step,
    toolPair,
    results,
    totalDurationMs: Date.now() - startTime,
  }
}

/**
 * Summary statistics for validation results.
 */
export interface ValidationSummary {
  readonly totalSnippets: number
  readonly passed: number
  readonly failed: number
  readonly skipped: number
  readonly totalDurationMs: number
  readonly failures: readonly {
    readonly file: string
    readonly lineStart: number
    readonly source: string
    readonly error: string
  }[]
}

/**
 * Compute summary statistics from validation results.
 */
export function computeSummary(results: readonly StepValidationResult[]): ValidationSummary {
  let passed = 0
  let failed = 0
  let skipped = 0
  let totalDurationMs = 0
  const failures: {
    file: string
    lineStart: number
    source: string
    error: string
  }[] = []

  for (const stepResult of results) {
    totalDurationMs += stepResult.totalDurationMs
    for (const snippetResult of stepResult.results) {
      switch (snippetResult.status) {
        case "pass":
          passed++
          break
        case "fail":
          failed++
          failures.push({
            file: snippetResult.snippet.file,
            lineStart: snippetResult.snippet.lineStart,
            source: snippetResult.snippet.source,
            error: snippetResult.error ?? "Unknown error",
          })
          break
        case "skipped":
          skipped++
          break
      }
    }
  }

  return {
    totalSnippets: passed + failed + skipped,
    passed,
    failed,
    skipped,
    totalDurationMs,
    failures,
  }
}
