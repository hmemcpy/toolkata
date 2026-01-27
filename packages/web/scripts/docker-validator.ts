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

// Docker images for different environments
const BASH_IMAGE = "toolkata-env:bash"
const SCALA_IMAGE = "toolkata-env:scala"

/**
 * Get the Docker image for a given environment.
 */
function getImageForEnvironment(environment: string): string {
  switch (environment) {
    case "bash":
    case "shell":
      return BASH_IMAGE
    case "scala":
      return SCALA_IMAGE
    default:
      return BASH_IMAGE
  }
}

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
  // Match simple placeholders like {repo-url}, {your-name} but NOT code blocks
  // Code blocks contain periods, parens, or are multi-line
  if (/\{[a-zA-Z][a-zA-Z0-9_-]*\}/.test(trimmed) && !/[.()]/.test(trimmed)) return true

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
 * ALL other errors should be treated as failures - proper setup should make them pass.
 */
const HALLUCINATION_PATTERNS = [
  /command not found/i,
  /unknown option/i,
  /invalid option/i,
  /unrecognized option/i,
  /unrecognized subcommand/i,
  /unexpected argument/i,
  /no such command/i,
  /is not a git command/i,
  /jj: unknown command/i,
  /error: unknown flag/i,
]

/**
 * Error patterns that indicate Scala compilation failure.
 */
const SCALA_ERROR_PATTERNS = [
  /^error:/im,
  /Found:/im,
  /Expected:/im,
  /Not found:/im,
  /type mismatch/i,
  /ambiguous/i,
]

/**
 * NO context error patterns - all commands should succeed with proper setup.
 * If a command fails due to context, that's a setup problem, not a command problem.
 */

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
 * Check if Scala compilation output indicates an error.
 */
function detectScalaError(output: string): string | null {
  for (const pattern of SCALA_ERROR_PATTERNS) {
    if (pattern.test(output)) {
      // Extract the error line
      const lines = output.split("\n")
      for (const line of lines) {
        if (pattern.test(line)) {
          return line.trim()
        }
      }
      return "Compilation error detected"
    }
  }
  return null
}

/**
 * Map of import patterns to scala-cli dependency directives.
 * These are the dependencies needed for the imports used in zio-cats lessons.
 */
const SCALA_DEPENDENCY_MAP: Record<string, string> = {
  "import zio": '//> using dep "dev.zio::zio:2.1.14"',
  "import zio.stream": '//> using dep "dev.zio::zio-streams:2.1.14"',
  "import cats.effect": '//> using dep "org.typelevel::cats-effect:3.5.7"',
  "import fs2": '//> using dep "co.fs2::fs2-core:3.11.0"',
}

/**
 * Prepare Scala code for compilation by wrapping with imports and wrapper.
 * Adds scala-cli dependency directives based on detected imports.
 */
function prepareScalaCode(code: string, config: ResolvedValidationConfig): string {
  const lines: string[] = []

  // Determine which dependencies are needed based on imports
  const neededDeps = new Set<string>()
  const allCode = `${code}\n${config.imports.join("\n")}`

  for (const [pattern, dep] of Object.entries(SCALA_DEPENDENCY_MAP)) {
    if (allCode.includes(pattern)) {
      neededDeps.add(dep)
    }
  }

  // Add scala-cli dependency directives at the top
  for (const dep of neededDeps) {
    lines.push(dep)
  }

  if (neededDeps.size > 0) {
    lines.push("") // Blank line after dependencies
  }

  // Add imports
  for (const imp of config.imports) {
    lines.push(imp)
  }

  lines.push("") // Blank line after imports

  // Add code wrapped in the template
  const wrapped = config.wrapper?.replace("${code}", code) ?? code
  lines.push(wrapped)

  return lines.join("\n")
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
 * Does not override entrypoint command - let the container's entrypoint run
 * its built-in keep-alive loop so environment variables are properly set.
 */
async function createContainer(name: string, image: string): Promise<string | null> {
  const result = await runCommand("docker", [
    "run",
    "-d",
    "--name",
    name,
    "--user",
    "sandbox",
    "--workdir",
    "/home/sandbox",
    image,
  ])

  if (result.exitCode !== 0) {
    return null
  }

  return result.stdout.trim()
}

/**
 * Execute a command in a container.
 * Sets JAVA_HOME and PATH environment variables explicitly since
 * docker exec doesn't inherit environment from the entrypoint.
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
    "-e",
    "HOME=/home/sandbox",
    "-e",
    "JAVA_HOME=/usr/lib/jvm/java-21-openjdk",
    "-e",
    "PATH=/usr/lib/jvm/java-21-openjdk/bin:/usr/local/sbin:/usr/local/bin:/usr/bin:/usr/sbin:/sbin:/bin",
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

  // Only handle bash/shell and scala
  const isBash = snippet.language === "bash" || snippet.language === "shell"
  const isScala = snippet.language === "scala"

  if (!isBash && !isScala) {
    return {
      snippet,
      status: "skipped",
      output: `Validation for ${snippet.language} not yet implemented`,
      durationMs: Date.now() - startTime,
    }
  }

  // Determine the Docker image to use
  const dockerImage = getImageForEnvironment(snippet.language)

  const containerName = `toolkata-validate-${randomUUID().slice(0, 8)}`

  try {
    if (verbose) {
      const preview = snippet.code.substring(0, 40)
      console.log(`[Docker] Starting ${snippet.language} container ${containerName} for: ${preview}...`)
    }

    // Start container with appropriate image
    const containerId = await createContainer(containerName, dockerImage)
    if (!containerId) {
      return {
        snippet,
        status: "fail",
        output: "",
        error: `Failed to create container using image ${dockerImage}`,
        durationMs: Date.now() - startTime,
      }
    }

    // Run setup commands (for bash only)
    if (isBash) {
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
    }

    let result: { stdout: string; stderr: string; exitCode: number }

    if (isScala) {
      // For Scala, prepare code with imports and wrapper, then compile
      const fullCode = prepareScalaCode(snippet.code, config)

      if (verbose) {
        console.log("[Docker] Compiling Scala snippet")
      }

      // Write code to temp file and compile
      const tempFile = `/tmp/snippet_${Date.now()}.scala`
      const writeCmd = `cat > ${tempFile} << 'SCALA_EOF'\n${fullCode}\nSCALA_EOF`

      const writeResult = await execInContainer(containerName, writeCmd)
      if (writeResult.exitCode !== 0) {
        return {
          snippet,
          status: "fail",
          output: writeResult.stdout,
          error: `Failed to write temp file: ${writeResult.stderr}`,
          durationMs: Date.now() - startTime,
        }
      }

      // Compile with scala-cli
      // --server=false disables bloop, --jvm system uses system JDK
      const compileCmd = `scala-cli compile --scala 3 --server=false --jvm system ${tempFile} 2>&1`
      result = await execInContainer(containerName, compileCmd)

      // Clean up temp file
      await execInContainer(containerName, `rm -f ${tempFile}`)

      // Check for compilation errors
      const combinedOutput = result.stdout + result.stderr
      const errorMsg = detectScalaError(combinedOutput)
      if (errorMsg) {
        return {
          snippet,
          status: "fail",
          output: combinedOutput,
          error: errorMsg,
          durationMs: Date.now() - startTime,
        }
      }

      // Exit code should be 0 for successful compilation
      if (result.exitCode !== 0) {
        return {
          snippet,
          status: "fail",
          output: result.stdout,
          error: result.stderr || `Compilation failed with exit code ${result.exitCode}`,
          durationMs: Date.now() - startTime,
        }
      }

      return {
        snippet,
        status: "pass",
        output: "Compilation successful",
        durationMs: Date.now() - startTime,
      }
    }

    // For bash/shell, execute the command directly
    if (verbose) {
      console.log(`[Docker] Executing: ${snippet.code}`)
    }

    result = await execInContainer(containerName, snippet.code)

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

    // Check exit code - any non-zero is a failure (no context error forgiveness)
    if (result.exitCode !== 0) {
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
 * Merge snippet-level config with base step config.
 * Snippet props (validate, setup) override base config.
 */
function mergeSnippetConfig(
  snippet: ExtractedSnippet,
  baseConfig: ResolvedValidationConfig,
): ResolvedValidationConfig {
  // Check if snippet has validate={false}
  if (snippet.validate === false) {
    return { ...baseConfig, skip: true }
  }

  // Check if snippet has setup override
  if (snippet.setup && snippet.setup.length >= 0) {
    return { ...baseConfig, setup: snippet.setup }
  }

  return baseConfig
}

/**
 * Validate a single snippet with merged config.
 */
async function validateSnippetWithConfig(
  snippet: ExtractedSnippet,
  baseConfig: ResolvedValidationConfig,
  verbose: boolean,
): Promise<SnippetValidationResult> {
  const config = mergeSnippetConfig(snippet, baseConfig)
  return validateSnippetInContainer(snippet, config, verbose)
}

/**
 * Validate all snippets for a single step.
 */
export async function validateStep(
  toolPair: string,
  step: number,
  snippets: readonly ExtractedSnippet[],
  baseConfig: ResolvedValidationConfig,
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
      (snippet) => validateSnippetWithConfig(snippet, baseConfig, verbose),
      maxParallel,
    )
  } else {
    // Run sequentially
    results = []
    for (const snippet of snippets) {
      const result = await validateSnippetWithConfig(snippet, baseConfig, verbose)
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
    readonly prop?: string
    readonly code: string
    readonly error: string
    readonly output: string
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
    prop?: string
    code: string
    error: string
    output: string
  }[] = []

  for (const stepResult of results) {
    totalDurationMs += stepResult.totalDurationMs
    for (const snippetResult of stepResult.results) {
      switch (snippetResult.status) {
        case "pass":
          passed++
          break
        case "fail": {
          failed++
          const base = {
            file: snippetResult.snippet.file,
            lineStart: snippetResult.snippet.lineStart,
            source: snippetResult.snippet.source,
            code: snippetResult.snippet.code,
            error: snippetResult.error ?? "Unknown error",
            output: snippetResult.output,
          }
          // Only add prop if defined (exactOptionalPropertyTypes)
          if (snippetResult.snippet.prop !== undefined) {
            failures.push({ ...base, prop: snippetResult.snippet.prop })
          } else {
            failures.push(base)
          }
          break
        }
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
