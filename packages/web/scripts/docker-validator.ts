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
import type { EventEmitter } from "node:events"
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
 *
 * This should ONLY skip things that are clearly not meant to be executed.
 * Valid commands that fail due to context should still run - we want to
 * catch hallucinated commands/flags, not context errors.
 */
function isNonExecutableCommand(code: string, _source: string): boolean {
  const trimmed = code.trim()

  // Interactive editors (require TTY)
  if (/^(vim|vi|nano|emacs|code|subl)\s/.test(trimmed)) return true

  // Placeholders with curly braces (not real commands)
  if (/\{[^}]+\}/.test(trimmed)) return true

  // Diagram-style text (not actual commands)
  // e.g., "[Working Copy] → [Staging] → [Repository]"
  if (/^\[.+\]\s*(→|->)/.test(trimmed)) return true

  // URL-only lines (documentation, not commands)
  if (/^https?:\/\/[^\s]+$/.test(trimmed)) return true

  // File path only (common in documentation)
  if (/^\/?[\w\/\.-]+\.(ts|js|tsx|jsx|py|rb|go|rs|java|cpp|c|h|css|html|json|yml|yaml|md|txt|sh|bash)$/.test(trimmed)) {
    return true
  }

  return false
}

/**
 * Error patterns that indicate HALLUCINATED commands/flags (validation failure).
 *
 * These patterns mean the LLM made up a command or flag that doesn't exist.
 */
const HALLUCINATION_PATTERNS = [
  /command not found/i,
  /unknown option/i,
  /invalid option/i,
  /unrecognized option/i,
  /unexpected argument/i,
  /no such command/i,
  /is not a git command/i,
  /jj: unknown command/i,
  /error: unknown flag/i,
]

/**
 * Error patterns that indicate CONTEXT issues (acceptable, not hallucinations).
 *
 * These mean the command exists but the current state doesn't support it.
 * E.g., "not a git repository" - git is installed, just not in a repo.
 */
const CONTEXT_ERROR_PATTERNS = [
  // Git context errors
  /^fatal: not a git repository/i,
  /^fatal: unable to access/i,
  /^fatal: not a valid object name/i,
  /^fatal: bad revision/i,
  /^fatal: /i, // Most git "fatal" errors are context issues
  /^error: nothing to commit/i,
  /^error: no changes added/i,
  /^error: pathspec/i,
  /^error: nothing to merge/i,

  // jj context errors
  /^error: no such revset/i,
  /^error: revision .* doesn't exist/i,
  /^error: change .* not found/i,
  /^error: no operation id matching/i,
  /^error: no such path/i,
  /^error: nothing to commit/i,
  /^error: merge conflict but auto-show/i,
  /^error: no conflicts found/i,
  /^error: divergent changes/i,

  // File system context errors
  /no such file or directory/i,
  /permission denied/i,
  /file not found/i,
  /directory not found/i,

  // Empty/missing data errors
  /^error: empty .* not allowed/i,
  /^error: no .+ provided/i,
  /^error: missing .+ argument/i,
]

/**
 * Check if shell output indicates a hallucination (validation failure).
 *
 * Returns null if no hallucination detected (even if there are context errors).
 * Returns error message if a hallucination is found.
 */
function detectShellError(output: string): string | null {
  // Check for hallucination patterns first
  for (const pattern of HALLUCINATION_PATTERNS) {
    if (pattern.test(output)) {
      const lines = output.split("\n")
      for (const line of lines) {
        if (pattern.test(line)) {
          return line.trim()
        }
      }
      return "Command or flag not found"
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
    const proc = spawn(command, args, { shell: false, stdio: ["ignore", "pipe", "pipe"] })
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

    // Cast to EventEmitter to access event methods
    // Note: ChildProcess extends EventEmitter but the typed return from spawn
    // with stdio array doesn't expose 'on' in the type system
    const emitter = proc as unknown as EventEmitter & { kill(signal?: NodeJS.Signals): void }
    emitter.on("close", (code: number | null) => {
      clearTimeout(timeout)
      resolve({ stdout, stderr, exitCode: code ?? 1 })
    })

    emitter.on("error", (err: Error) => {
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
  if (isNonExecutableCommand(snippet.code, snippet.source)) {
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

    // Combine output for pattern matching
    const combinedOutput = result.stdout + result.stderr

    // Check for HALLUCINATION patterns first (regardless of exit code)
    const hallucinationMsg = detectShellError(combinedOutput)
    if (hallucinationMsg) {
      return {
        snippet,
        status: "fail",
        output: result.stdout,
        error: hallucinationMsg,
        durationMs: Date.now() - startTime,
      }
    }

    // Check if non-zero exit code is due to context issues (acceptable)
    if (result.exitCode !== 0) {
      // Check if this is a known context error pattern
      const isContextError = CONTEXT_ERROR_PATTERNS.some((pattern) => pattern.test(combinedOutput))

      if (isContextError) {
        // Context error is acceptable - the command exists, just wrong state
        return {
          snippet,
          status: "pass",
          output: result.stdout,
          durationMs: Date.now() - startTime,
        }
      }

      // Unknown non-zero exit - might be a hallucination we didn't catch
      // or some other issue. Fail to be safe.
      return {
        snippet,
        status: "fail",
        output: result.stdout,
        error: result.stderr || `Exit code: ${result.exitCode}`,
        durationMs: Date.now() - startTime,
      }
    }

    // Exit code 0 and no hallucinations - success
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
