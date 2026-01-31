/**
 * Kata Validation Service - Validates user solutions against sandbox state.
 *
 * Executes validation commands via WebSocket and parses output to determine
 * if exercises are completed correctly.
 *
 * @example
 * ```ts
 * import { validateExercise } from "./services/kata-validation"
 *
 * const result = await validateExercise(
 *   exercise,
 *   "my-session-id",
 *   "ws://localhost:3001/api/v1/sessions/my-session-id/ws"
 * )
 *
 * if (result.success) {
 *   console.log("Exercise complete!")
 * }
 * ```
 */

import type { Exercise } from "../lib/content/schemas"
import { getSandboxHttpUrl, SANDBOX_API_KEY } from "../lib/sandbox-url"

/**
 * Result of validating an exercise.
 */
export interface ValidationResult {
  /**
   * Whether the validation passed.
   */
  readonly success: boolean

  /**
   * Hint message to show to the user.
   * For failures, explains what went wrong.
   * For success, may confirm completion.
   */
  readonly hint: string

  /**
   * The actual output from the validation command.
   * Useful for debugging and showing partial results.
   */
  readonly actualOutput: string

  /**
   * The command that was executed.
   */
  readonly command: string
}

/**
 * Error types for validation operations.
 */
export class ValidationError extends Error {
  readonly cause: "NetworkError" | "TimeoutError" | "ParseError" | "SandboxUnavailable"
  readonly command: string | undefined

  constructor(cause: ValidationError["cause"], message: string, command?: string) {
    super(message)
    this.name = "ValidationError"
    this.cause = cause
    this.command = command
  }
}

/**
 * WebSocket message types for sandbox communication.
 */
interface WsConnectedMessage {
  readonly type: "connected"
  readonly sessionId: string
}

interface WsOutputMessage {
  readonly type: "output"
  readonly data: string
}

interface WsErrorMessage {
  readonly type: "error"
  readonly message: string
}

type WsMessage = WsConnectedMessage | WsOutputMessage | WsErrorMessage

/**
 * ANSI escape code patterns.
 * Used to strip color codes from terminal output.
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape codes are required for terminal output parsing
const ANSI_CODE_PATTERN = /\x1b\[[0-9;]*m/g

/**
 * Strip ANSI escape codes from terminal output.
 */
function stripAnsiCodes(input: string): string {
  return input.replace(ANSI_CODE_PATTERN, "")
}

/**
 * Execute a command in the sandbox via WebSocket and collect output.
 *
 * @param wsUrl - WebSocket URL for the session
 * @param command - Command to execute
 * @param timeoutMs - Timeout in milliseconds (default 5000)
 * @returns The command output (stripped of ANSI codes)
 */
async function executeCommand(wsUrl: string, command: string, timeoutMs = 5000): Promise<string> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl)

    // Output buffer to collect terminal output
    const outputBuffer: string[] = []

    // Timeout handler
    const timeout = setTimeout(() => {
      ws.close()
      reject(new ValidationError("TimeoutError", `Command timed out after ${timeoutMs}ms`, command))
    }, timeoutMs)

    // Track last output time for prompt detection
    let lastOutputTime = Date.now()
    const promptSettleTime = 500 // Wait 500ms after last output
    const promptCheckInterval = 200 // Check every 200ms

    // Check if we have a shell prompt (command completed)
    const checkForPrompt = () => {
      const fullOutput = outputBuffer.join("")
      const trimmed = stripAnsiCodes(fullOutput)
      const lines = trimmed.split("\n")
      const lastLine = lines[lines.length - 1] ?? ""

      // Check for shell prompt patterns: "$ ", "# ", "> "
      const hasPrompt = /[$#>]\s*$/.test(lastLine)
      const timeSinceLastOutput = Date.now() - lastOutputTime

      if (hasPrompt && timeSinceLastOutput >= promptSettleTime) {
        // Command complete - extract output (exclude command echo and prompt)
        const outputLines = lines.slice(1, -1)
        const output = outputLines.join("\n").trim()
        cleanup()
        resolve(output)
      }
    }

    const promptInterval = setInterval(checkForPrompt, promptCheckInterval)

    const cleanup = () => {
      clearTimeout(timeout)
      clearInterval(promptInterval)
      ws.close()
    }

    ws.onopen = () => {
      // Send the command immediately after connection
      ws.send(
        JSON.stringify({
          type: "input",
          data: `${command}\n`,
        }),
      )
    }

    ws.onmessage = (event: MessageEvent) => {
      const data = typeof event.data === "string" ? event.data : String(event.data)

      // Try to parse as JSON for structured messages
      try {
        const msg = JSON.parse(data) as WsMessage

        if (msg.type === "connected") {
          // Connection established, command will be sent
          return
        }

        if (msg.type === "error") {
          cleanup()
          reject(new ValidationError("NetworkError", msg.message, command))
          return
        }
      } catch {
        // Not JSON - treat as raw PTY output
      }

      // Track output for prompt detection
      outputBuffer.push(data)
      lastOutputTime = Date.now()
    }

    ws.onerror = (event: Event) => {
      cleanup()
      reject(new ValidationError("NetworkError", `WebSocket error: ${event.type}`, command))
    }

    ws.onclose = () => {
      // If we haven't resolved yet and have output, return it
      if (outputBuffer.length > 0) {
        const fullOutput = outputBuffer.join("")
        const trimmed = stripAnsiCodes(fullOutput)
        const lines = trimmed.split("\n")
        // Remove command echo and last line (prompt)
        const outputLines = lines.slice(1, -1)
        const output = outputLines.join("\n").trim()
        resolve(output)
      } else {
        reject(new ValidationError("NetworkError", "WebSocket closed unexpectedly", command))
      }
    }
  })
}

/**
 * Validate using the "command" type.
 *
 * Executes the command and checks if it completed without errors.
 * Success is determined by the absence of error patterns in output.
 */
async function validateByCommand(output: string, command: string): Promise<ValidationResult> {
  // Shell error patterns that indicate failure
  const errorPatterns = [
    /^error:/im,
    /^fatal:/im,
    /^usage:/im,
    /command not found/i,
    /no such file or directory/i,
    /permission denied/i,
  ]

  const errorMsg = errorPatterns.find((pattern) => pattern.test(output))

  if (errorMsg) {
    return {
      success: false,
      hint: `Command failed: ${
        output
          .split("\n")
          .find((line) => errorMsg.test(line))
          ?.trim() ?? "Unknown error"
      }`,
      actualOutput: output,
      command,
    }
  }

  return {
    success: true,
    hint: "Command executed successfully",
    actualOutput: output,
    command,
  }
}

/**
 * Validate using the "regex" type.
 *
 * Executes the command and checks if the output matches the expected pattern.
 */
async function validateByRegex(
  output: string,
  command: string,
  expectedPattern: string,
): Promise<ValidationResult> {
  try {
    const regex = new RegExp(expectedPattern, "im")
    const matched = regex.test(output)

    if (matched) {
      return {
        success: true,
        hint: `Found expected pattern: ${expectedPattern}`,
        actualOutput: output,
        command,
      }
    }

    return {
      success: false,
      hint: `Expected pattern not found: ${expectedPattern}`,
      actualOutput: output,
      command,
    }
  } catch (_err: unknown) {
    throw new ValidationError("ParseError", `Invalid regex pattern: ${expectedPattern}`, command)
  }
}

/**
 * Validate using the "exact" type.
 *
 * Executes the command and checks if the output exactly matches the expected value.
 */
async function validateByExact(
  output: string,
  command: string,
  expectedValue: string,
): Promise<ValidationResult> {
  const normalizedOutput = output.trim()
  const normalizedExpected = expectedValue.trim()

  if (normalizedOutput === normalizedExpected) {
    return {
      success: true,
      hint: "Output matches expected value",
      actualOutput: output,
      command,
    }
  }

  return {
    success: false,
    hint: `Expected: "${normalizedExpected}" but got: "${normalizedOutput}"`,
    actualOutput: output,
    command,
  }
}

/**
 * Validate using the "count" type.
 *
 * Executes the command and counts the number of lines or items in output.
 * Checks if the count meets or exceeds the minimum required.
 */
async function validateByCount(
  output: string,
  command: string,
  minCount: number,
): Promise<ValidationResult> {
  // Count non-empty lines
  const lines = output.split("\n").filter((line) => line.trim().length > 0)
  const count = lines.length

  if (count >= minCount) {
    return {
      success: true,
      hint: `Found ${count} items (required: ${minCount})`,
      actualOutput: output,
      command,
    }
  }

  return {
    success: false,
    hint: `Found ${count} items, but need at least ${minCount}`,
    actualOutput: output,
    command,
  }
}

/**
 * Validate a user's solution for an exercise.
 *
 * @param exercise - The exercise to validate with its validation config
 * @param sessionId - The sandbox session ID
 * @returns Validation result with success status and hint
 */
export async function validateExercise(
  exercise: Exercise,
  sessionId: string,
): Promise<ValidationResult> {
  const { validation } = exercise

  // Build WebSocket URL
  const apiUrl = getSandboxHttpUrl()
  const wsUrl = new URL(`/api/v1/sessions/${sessionId}/ws`, apiUrl)
  wsUrl.protocol = wsUrl.protocol === "https:" ? "wss:" : "ws:"

  // Add API key if configured
  if (SANDBOX_API_KEY !== "") {
    wsUrl.searchParams.set("api_key", SANDBOX_API_KEY)
  }

  // Execute the validation command
  const output = await executeCommand(wsUrl.toString(), validation.command)

  // Route to appropriate validation method
  switch (validation.type) {
    case "command":
      return validateByCommand(output, validation.command)

    case "regex":
      if (!validation.expectedPattern) {
        throw new ValidationError(
          "ParseError",
          "Regex validation requires expectedPattern",
          validation.command,
        )
      }
      return validateByRegex(output, validation.command, validation.expectedPattern)

    case "exact":
      if (!validation.expectedValue) {
        throw new ValidationError(
          "ParseError",
          "Exact validation requires expectedValue",
          validation.command,
        )
      }
      return validateByExact(output, validation.command, validation.expectedValue)

    case "count":
      if (!validation.minCount) {
        throw new ValidationError(
          "ParseError",
          "Count validation requires minCount",
          validation.command,
        )
      }
      return validateByCount(output, validation.command, validation.minCount)

    default:
      throw new ValidationError(
        "ParseError",
        `Unknown validation type: ${validation.type}`,
        validation.command,
      )
  }
}

/**
 * Batch validate multiple exercises (for testing or pre-computation).
 *
 * Executes all validations and returns results.
 *
 * @param exercises - Array of exercises to validate
 * @param sessionId - The sandbox session ID
 * @returns Map of exercise ID to validation result
 */
export async function validateExercises(
  exercises: readonly Exercise[],
  sessionId: string,
): Promise<ReadonlyMap<string, ValidationResult>> {
  const results = new Map<string, ValidationResult>()

  for (const exercise of exercises) {
    try {
      const result = await validateExercise(exercise, sessionId)
      results.set(exercise.id, result)
    } catch (err: unknown) {
      // Record validation errors as failed results
      const hint = err instanceof ValidationError ? err.message : "Validation failed"
      results.set(exercise.id, {
        success: false,
        hint,
        actualOutput: "",
        command: exercise.validation.command,
      })
    }
  }

  return results
}
