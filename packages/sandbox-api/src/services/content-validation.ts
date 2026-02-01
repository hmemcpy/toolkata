import { Context, Data, Effect, Layer } from "effect"
import { spawn } from "node:child_process"
import type { EventEmitter } from "node:events"
import { randomUUID } from "node:crypto"

/**
 * Content Validation Service for CMS
 *
 * Validates MDX content snippets in Docker containers before commit.
 * This is a wrapper around the existing snippet validation infrastructure
 * designed for CMS use cases (single-file validation on demand).
 *
 * @see specs/content-cms.md for full specification
 */

// ============================================================================
// Error Types
// ============================================================================

export type ValidationErrorCause =
  | "DockerNotAvailable"
  | "ImageNotFound"
  | "ContainerFailed"
  | "Timeout"
  | "ParseError"
  | "UnknownError"

export class ContentValidationError extends Data.TaggedClass("ContentValidationError")<{
  readonly cause: ValidationErrorCause
  readonly message: string
  readonly originalError?: unknown
}> {}

// ============================================================================
// Data Models (from specs/content-cms.md)
// ============================================================================

export interface SnippetError {
  readonly line: number
  readonly column?: number
  readonly message: string
  readonly type: "syntax" | "compilation" | "runtime" | "missing-image"
}

export interface SnippetValidationResult {
  readonly file: string
  readonly valid: boolean
  readonly errors: readonly SnippetError[]
  readonly duration: number
  readonly timestamp: number
}

export interface ValidationRequest {
  readonly path: string
  readonly content: string
  readonly toolPair: string
}

// ============================================================================
// Internal Types
// ============================================================================

interface ExtractedSnippet {
  readonly lineStart: number
  readonly language: "bash" | "shell" | "scala" | "typescript"
  readonly source: string
  readonly code: string
  readonly prop?: string
  readonly validate?: boolean
}

// Docker images for different environments
const BASH_IMAGE = "toolkata-env:bash"
const SCALA_IMAGE = "toolkata-env:scala"

// ============================================================================
// Service Interface
// ============================================================================

export interface ContentValidationServiceShape {
  /**
   * Validate a single MDX file's snippets
   */
  readonly validateContent: (
    request: ValidationRequest,
  ) => Effect.Effect<SnippetValidationResult, ContentValidationError>

  /**
   * Validate multiple files in batch
   */
  readonly validateBatch: (
    requests: readonly ValidationRequest[],
  ) => Effect.Effect<readonly SnippetValidationResult[], ContentValidationError>

  /**
   * Check if Docker is available with required images
   */
  readonly checkDockerAvailable: () => Effect.Effect<boolean, ContentValidationError>
}

// Service Tag
export class ContentValidationService extends Context.Tag("ContentValidationService")<
  ContentValidationService,
  ContentValidationServiceShape
>() {}

// ============================================================================
// Helper Functions
// ============================================================================

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

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString()
    })

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString()
    })

    // Cast to EventEmitter to access event methods
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
 * Check if a Docker image exists.
 */
async function dockerImageExists(image: string): Promise<boolean> {
  const result = await runCommand("docker", ["image", "inspect", image])
  return result.exitCode === 0
}

/**
 * Create and start a container, returning its name.
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
 * Process code using stripMargin-style formatting.
 * Each line starting with `|` has everything before and including the `|` stripped.
 */
function normalizeCode(code: string): string {
  const lines = code.split("\n")

  // Apply stripMargin: remove everything up to and including `|` on each line
  const strippedLines = lines.map((line) => {
    const pipeIndex = line.indexOf("|")
    if (pipeIndex !== -1) {
      return line.slice(pipeIndex + 1)
    }
    return line
  })

  // Remove leading blank lines
  let startIndex = 0
  while (startIndex < strippedLines.length && strippedLines[startIndex]?.trim() === "") {
    startIndex++
  }

  // Remove trailing blank lines
  let endIndex = strippedLines.length - 1
  while (endIndex >= startIndex && strippedLines[endIndex]?.trim() === "") {
    endIndex--
  }

  return strippedLines.slice(startIndex, endIndex + 1).join("\n")
}

/**
 * Extract snippets from MDX content for validation.
 */
function extractSnippets(content: string): ExtractedSnippet[] {
  const snippets: ExtractedSnippet[] = []

  // Find line number where a pattern first appears
  const findLineNumber = (searchIndex: number): number => {
    return content.slice(0, searchIndex).split("\n").length
  }

  // Extract TryIt components
  const tryItDoubleQuote = /<TryIt\s+[^>]*command="([^"]+)"[^>]*\/>/g
  const tryItSingleQuote = /<TryIt\s+[^>]*command='([^']+)'[^>]*\/>/g

  for (const match of content.matchAll(tryItDoubleQuote)) {
    const command = match[1]
    const fullMatch = match[0]
    if (command?.trim()) {
      const hasValidateFalse = /validate\s*=\s*{\s*false\s*}/.test(fullMatch)
      const snippet: ExtractedSnippet = {
        lineStart: findLineNumber(match.index ?? 0),
        language: "bash",
        source: "TryIt",
        code: command.trim(),
      }
      if (hasValidateFalse) {
        snippets.push({ ...snippet, validate: false })
      } else {
        snippets.push(snippet)
      }
    }
  }

  for (const match of content.matchAll(tryItSingleQuote)) {
    const command = match[1]
    const fullMatch = match[0]
    if (command?.trim()) {
      const hasValidateFalse = /validate\s*=\s*{\s*false\s*}/.test(fullMatch)
      const snippet: ExtractedSnippet = {
        lineStart: findLineNumber(match.index ?? 0),
        language: "bash",
        source: "TryIt",
        code: command.trim(),
      }
      if (hasValidateFalse) {
        snippets.push({ ...snippet, validate: false })
      } else {
        snippets.push(snippet)
      }
    }
  }

  // Extract ScalaComparisonBlock components
  const scalaBlockRegex = /<ScalaComparisonBlock\s+([\s\S]*?)\/>/g
  for (const match of content.matchAll(scalaBlockRegex)) {
    const propsContent = match[1]
    if (!propsContent) continue

    const lineStart = findLineNumber(match.index ?? 0)
    const validateFalse = /validate=\{false\}/.test(propsContent)

    // Extract zioCode
    const zioMatch = propsContent.match(/zioCode=\{`([\s\S]*?)`\}/)
    const zioCode = zioMatch?.[1]
    if (zioCode !== undefined) {
      const snippet: ExtractedSnippet = {
        lineStart,
        language: "scala",
        source: "ScalaComparisonBlock",
        code: normalizeCode(zioCode),
        prop: "zioCode",
      }
      if (validateFalse) {
        snippets.push({ ...snippet, validate: false })
      } else {
        snippets.push(snippet)
      }
    }

    // Extract catsEffectCode
    const ceMatch = propsContent.match(/catsEffectCode=\{`([\s\S]*?)`\}/)
    const ceCode = ceMatch?.[1]
    if (ceCode !== undefined) {
      const snippet: ExtractedSnippet = {
        lineStart,
        language: "scala",
        source: "ScalaComparisonBlock",
        code: normalizeCode(ceCode),
        prop: "catsEffectCode",
      }
      if (validateFalse) {
        snippets.push({ ...snippet, validate: false })
      } else {
        snippets.push(snippet)
      }
    }
  }

  // Extract CrossLanguageBlock components
  const crossBlockRegex = /<CrossLanguageBlock\s+([\s\S]*?)\/>/g
  for (const match of content.matchAll(crossBlockRegex)) {
    const propsContent = match[1]
    if (!propsContent) continue

    const lineStart = findLineNumber(match.index ?? 0)
    const validateFalse = /validate=\{false\}/.test(propsContent)

    // Extract zioCode (Scala)
    const zioMatch = propsContent.match(/zioCode=\{`([\s\S]*?)`\}/)
    const zioCode = zioMatch?.[1]
    if (zioCode !== undefined) {
      const snippet: ExtractedSnippet = {
        lineStart,
        language: "scala",
        source: "CrossLanguageBlock",
        code: normalizeCode(zioCode),
        prop: "zioCode",
      }
      if (validateFalse) {
        snippets.push({ ...snippet, validate: false })
      } else {
        snippets.push(snippet)
      }
    }

    // Extract effectCode (TypeScript)
    const effectMatch = propsContent.match(/effectCode=\{`([\s\S]*?)`\}/)
    const effectCode = effectMatch?.[1]
    if (effectCode !== undefined) {
      const snippet: ExtractedSnippet = {
        lineStart,
        language: "typescript",
        source: "CrossLanguageBlock",
        code: normalizeCode(effectCode),
        prop: "effectCode",
      }
      if (validateFalse) {
        snippets.push({ ...snippet, validate: false })
      } else {
        snippets.push(snippet)
      }
    }
  }

  // Sort by line number
  snippets.sort((a, b) => a.lineStart - b.lineStart)

  return snippets
}

/**
 * Determine error type from validation output.
 */
function categorizeError(
  output: string,
  language: "bash" | "shell" | "scala" | "typescript",
): SnippetError["type"] {
  if (language === "scala" || language === "typescript") {
    // Compilation errors
    if (/error:/i.test(output) || /Not found:/i.test(output) || /type mismatch/i.test(output)) {
      return "compilation"
    }
    // Syntax errors
    if (/unexpected token/i.test(output) || /expected/i.test(output)) {
      return "syntax"
    }
  }

  // Shell errors
  if (/command not found/i.test(output) || /no such command/i.test(output)) {
    return "syntax"
  }

  // Runtime errors
  if (/exit code/i.test(output) || /exception/i.test(output)) {
    return "runtime"
  }

  return "runtime"
}

/**
 * Get Docker image for a language.
 */
function getImageForLanguage(language: "bash" | "shell" | "scala" | "typescript"): string {
  switch (language) {
    case "bash":
    case "shell":
      return BASH_IMAGE
    case "scala":
      return SCALA_IMAGE
    case "typescript":
      // TypeScript uses the bash image with tsx/effect installed
      return BASH_IMAGE
    default:
      return BASH_IMAGE
  }
}

/**
 * Get setup commands for a tool pair (bash only).
 */
function getSetupCommands(toolPair: string): string[] {
  if (toolPair === "jj-git") {
    return [
      "jj git init --colocate .",
      "git config user.email 'test@test.com'",
      "git config user.name 'Test User'",
    ]
  }
  return []
}

/**
 * Validate a single snippet in a Docker container.
 */
async function validateSnippet(
  snippet: ExtractedSnippet,
  toolPair: string,
): Promise<{ passed: boolean; error?: string; output?: string }> {
  // Skip if validate is false
  if (snippet.validate === false) {
    return { passed: true }
  }

  // Skip pseudo-code
  const trimmed = snippet.code.trim()
  if (!trimmed || trimmed === "???" || trimmed.includes("= ???") || trimmed === "...") {
    return { passed: true }
  }

  const image = getImageForLanguage(snippet.language)
  const containerName = `toolkata-cms-validate-${randomUUID().slice(0, 8)}`

  try {
    // Create container
    const containerId = await createContainer(containerName, image)
    if (!containerId) {
      return {
        passed: false,
        error: `Failed to create container using image ${image}`,
      }
    }

    try {
      // Run setup commands for bash
      if (snippet.language === "bash" || snippet.language === "shell") {
        const setupCommands = getSetupCommands(toolPair)
        for (const cmd of setupCommands) {
          const result = await execInContainer(containerName, cmd)
          if (result.exitCode !== 0) {
            return {
              passed: false,
              error: `Setup failed: ${result.stderr || result.stdout}`,
              output: result.stdout,
            }
          }
        }

        // Execute the command
        const result = await execInContainer(containerName, snippet.code)
        const combinedOutput = result.stdout + result.stderr

        // Check for common error patterns
        if (/command not found/i.test(combinedOutput) || /no such command/i.test(combinedOutput)) {
          return {
            passed: false,
            error: combinedOutput.trim(),
            output: result.stdout,
          }
        }

        if (result.exitCode !== 0) {
          return {
            passed: false,
            error: result.stderr || `Exit code: ${result.exitCode}`,
            output: result.stdout,
          }
        }

        return { passed: true, output: result.stdout }
      }

      // Scala compilation
      if (snippet.language === "scala") {
        const tempFile = `/tmp/snippet_${Date.now()}.scala`

        // Prepare code with imports
        const imports =
          snippet.prop === "catsEffectCode"
            ? [
                "import cats.effect._",
                "import cats.effect.std._",
                "import cats.effect.unsafe.implicits.global",
                "import fs2._",
              ]
            : [
                "import zio._",
                "import zio.Console._",
                "import zio.stream._",
                "import zio.stm._",
                "import java.io.IOException",
              ]

        // Add scala-cli dependencies
        const deps: string[] = []
        if (snippet.prop === "catsEffectCode") {
          deps.push('//> using dep "org.typelevel::cats-effect:3.5.7"')
          deps.push('//> using dep "co.fs2::fs2-core:3.11.0"')
        } else {
          deps.push('//> using dep "dev.zio::zio:2.1.14"')
          deps.push('//> using dep "dev.zio::zio-streams:2.1.14"')
        }

        const fullCode = [
          ...deps,
          "",
          ...imports,
          "",
          "object Main extends App {",
          snippet.code,
          "}",
        ].join("\n")

        // Write file
        const writeCmd = `cat > ${tempFile} << 'SCALA_EOF'\n${fullCode}\nSCALA_EOF`
        const writeResult = await execInContainer(containerName, writeCmd)
        if (writeResult.exitCode !== 0) {
          return {
            passed: false,
            error: `Failed to write temp file: ${writeResult.stderr}`,
          }
        }

        // Compile
        const compileCmd = `scala-cli compile --scala 3 --server=false --jvm system ${tempFile} 2>&1`
        const result = await execInContainer(containerName, compileCmd)

        // Clean up
        await execInContainer(containerName, `rm -f ${tempFile}`)

        const combinedOutput = result.stdout + result.stderr

        // Check for compilation errors
        if (
          /^error:/im.test(combinedOutput) ||
          /Not found:/im.test(combinedOutput) ||
          /type mismatch/i.test(combinedOutput)
        ) {
          return {
            passed: false,
            error: combinedOutput.split("\n").find((l) => /error:/i.test(l)) ?? "Compilation error",
            output: combinedOutput,
          }
        }

        if (result.exitCode !== 0) {
          return {
            passed: false,
            error: `Compilation failed with exit code ${result.exitCode}`,
            output: combinedOutput,
          }
        }

        return { passed: true }
      }

      // TypeScript - skip for now (not fully implemented)
      if (snippet.language === "typescript") {
        return { passed: true }
      }

      return { passed: true }
    } finally {
      // Always clean up container
      await removeContainer(containerName)
    }
  } catch (err) {
    return {
      passed: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

// ============================================================================
// Service Implementation
// ============================================================================

const make = Effect.gen(function* () {
  const validateContent = (
    request: ValidationRequest,
  ): Effect.Effect<SnippetValidationResult, ContentValidationError> =>
    Effect.gen(function* () {
      const startTime = Date.now()

      // Extract snippets from content
      const snippets = extractSnippets(request.content)

      if (snippets.length === 0) {
        // No snippets to validate
        return {
          file: request.path,
          valid: true,
          errors: [],
          duration: Date.now() - startTime,
          timestamp: Date.now(),
        }
      }

      const errors: SnippetError[] = []

      // Validate each snippet
      for (const snippet of snippets) {
        const result = yield* Effect.tryPromise({
          try: () => validateSnippet(snippet, request.toolPair),
          catch: (err) =>
            new ContentValidationError({
              cause: "ContainerFailed",
              message: `Container validation failed: ${err instanceof Error ? err.message : String(err)}`,
              originalError: err,
            }),
        })

        if (!result.passed && result.error) {
          errors.push({
            line: snippet.lineStart,
            message: result.error,
            type: categorizeError(result.error, snippet.language),
          })
        }
      }

      return {
        file: request.path,
        valid: errors.length === 0,
        errors,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      }
    })

  const validateBatch = (
    requests: readonly ValidationRequest[],
  ): Effect.Effect<readonly SnippetValidationResult[], ContentValidationError> =>
    Effect.gen(function* () {
      const results: SnippetValidationResult[] = []

      // Validate sequentially to avoid overwhelming Docker
      for (const request of requests) {
        const result = yield* validateContent(request)
        results.push(result)
      }

      return results
    })

  const checkDockerAvailable = (): Effect.Effect<boolean, ContentValidationError> =>
    Effect.gen(function* () {
      // Check if Docker is running
      const dockerRunning = yield* Effect.tryPromise({
        try: async () => {
          const result = await runCommand("docker", ["info"])
          return result.exitCode === 0
        },
        catch: () =>
          new ContentValidationError({
            cause: "DockerNotAvailable",
            message: "Docker is not available",
          }),
      })

      if (!dockerRunning) {
        return false
      }

      // Check if required images exist
      const bashExists = yield* Effect.tryPromise({
        try: () => dockerImageExists(BASH_IMAGE),
        catch: () =>
          new ContentValidationError({
            cause: "DockerNotAvailable",
            message: "Failed to check Docker image",
          }),
      })

      return bashExists
    })

  return {
    validateContent,
    validateBatch,
    checkDockerAvailable,
  } satisfies ContentValidationServiceShape
})

// Live Layer
export const ContentValidationServiceLive = Layer.effect(ContentValidationService, make)
