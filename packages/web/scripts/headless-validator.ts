/**
 * Headless Validator - Executes code snippets against sandbox environments.
 *
 * This module provides headless (no UI) execution of snippets:
 * 1. Creates sandbox sessions via HTTP API
 * 2. Connects via WebSocket to execute commands
 * 3. Collects output and detects errors
 * 4. Reuses sessions per step (all snippets in a step share one session)
 */

import type { ExtractedSnippet } from "./snippet-extractor.js"
import { groupSnippetsByStep, isPseudoCode } from "./snippet-extractor.js"
import type { ResolvedValidationConfig } from "./config-resolver.js"

const DEFAULT_SANDBOX_URL = "http://localhost:3001"
const DEFAULT_API_KEY = "dev-api-key" // Default for local development
const COMMAND_TIMEOUT_MS = 30_000
const SESSION_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

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
 * Options for the headless validator.
 */
export interface ValidatorOptions {
  readonly sandboxUrl?: string
  readonly apiKey?: string
  readonly verbose?: boolean
}

/**
 * Response from creating a session.
 */
interface CreateSessionResponse {
  readonly sessionId: string
  readonly wsUrl: string
  readonly status: string
  readonly createdAt: string
  readonly expiresAt: string
}

/**
 * WebSocket message types.
 */
interface WsConnectedMessage {
  readonly type: "connected"
  readonly sessionId: string
}

interface WsOutputMessage {
  readonly type: "output"
  readonly data: string
}

interface WsInitCompleteMessage {
  readonly type: "initComplete"
  readonly success: boolean
  readonly error?: string
}

interface WsErrorMessage {
  readonly type: "error"
  readonly message: string
}

type WsMessage = WsConnectedMessage | WsOutputMessage | WsInitCompleteMessage | WsErrorMessage

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
      // Extract the error line
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
 * Manages a single sandbox session for validation.
 * Uses Bun's native WebSocket for communication.
 */
class SandboxSession {
  private ws: WebSocket | null = null
  private readonly sandboxUrl: string
  private readonly apiKey: string
  private readonly verbose: boolean
  private sessionId: string | null = null
  private outputBuffer: string[] = []
  private messageHandlers: ((msg: WsMessage) => void)[] = []

  constructor(options: ValidatorOptions) {
    this.sandboxUrl = options.sandboxUrl ?? process.env["SANDBOX_API_URL"] ?? DEFAULT_SANDBOX_URL
    this.apiKey = options.apiKey ?? process.env["SANDBOX_API_KEY"] ?? DEFAULT_API_KEY
    this.verbose = options.verbose ?? false
  }

  /**
   * Create a new session via HTTP API.
   */
  async create(toolPair: string, environment = "bash"): Promise<string> {
    const response = await fetch(`${this.sandboxUrl}/api/v1/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
      },
      body: JSON.stringify({
        toolPair,
        environment,
        timeout: SESSION_TIMEOUT_MS,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to create session: ${response.status} ${errorText}`)
    }

    const data = (await response.json()) as CreateSessionResponse
    this.sessionId = data.sessionId

    if (this.verbose) {
      console.log(`[HeadlessValidator] Created session: ${this.sessionId}`)
    }

    return this.sessionId
  }

  /**
   * Connect to the session via WebSocket.
   * Uses Bun's native WebSocket (browser-compatible API).
   */
  async connect(): Promise<void> {
    if (!this.sessionId) {
      throw new Error("Session not created yet")
    }

    const wsUrl = new URL(`/api/v1/sessions/${this.sessionId}/ws`, this.sandboxUrl)
    wsUrl.protocol = wsUrl.protocol === "https:" ? "wss:" : "ws:"
    wsUrl.searchParams.set("api_key", this.apiKey)
    wsUrl.searchParams.set("cols", "80")
    wsUrl.searchParams.set("rows", "24")

    return new Promise((resolve, reject) => {
      // Use Bun's native WebSocket (browser-compatible API)
      this.ws = new WebSocket(wsUrl.toString())

      const timeout = setTimeout(() => {
        reject(new Error("WebSocket connection timeout"))
      }, 10_000)

      this.ws.onopen = () => {
        if (this.verbose) {
          console.log("[HeadlessValidator] WebSocket connected")
        }
      }

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const data = typeof event.data === "string" ? event.data : String(event.data)
          const msg = JSON.parse(data) as WsMessage
          this.handleMessage(msg)

          if (msg.type === "connected") {
            clearTimeout(timeout)
            resolve()
          } else if (msg.type === "error") {
            clearTimeout(timeout)
            reject(new Error(msg.message))
          }
        } catch {
          // Ignore parse errors for non-JSON messages
        }
      }

      this.ws.onerror = (event: Event) => {
        clearTimeout(timeout)
        reject(new Error(`WebSocket error: ${event.type}`))
      }

      this.ws.onclose = () => {
        if (this.verbose) {
          console.log("[HeadlessValidator] WebSocket closed")
        }
      }
    })
  }

  /**
   * Handle incoming WebSocket messages.
   */
  private handleMessage(msg: WsMessage): void {
    if (msg.type === "output") {
      this.outputBuffer.push(msg.data)
    }

    // Notify all registered handlers
    for (const handler of this.messageHandlers) {
      handler(msg)
    }
  }

  /**
   * Run setup/init commands silently.
   */
  async runInitCommands(commands: readonly string[], timeoutMs = 30_000): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not connected")
    }

    if (commands.length === 0) {
      return
    }

    if (this.verbose) {
      console.log(`[HeadlessValidator] Running ${commands.length} init commands`)
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Init commands timed out after ${timeoutMs}ms`))
      }, timeoutMs)

      const handler = (msg: WsMessage) => {
        if (msg.type === "initComplete") {
          clearTimeout(timeout)
          this.messageHandlers = this.messageHandlers.filter((h) => h !== handler)

          if (msg.success) {
            resolve()
          } else {
            reject(new Error(msg.error ?? "Init commands failed"))
          }
        }
      }

      this.messageHandlers.push(handler)

      // Send init command with silent mode
      this.ws?.send(
        JSON.stringify({
          type: "init",
          commands,
          timeout: timeoutMs,
          silent: true,
        }),
      )
    })
  }

  /**
   * Execute a command and collect output.
   * Waits for the shell prompt to return.
   */
  async executeCommand(command: string, timeoutMs: number = COMMAND_TIMEOUT_MS): Promise<string> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not connected")
    }

    // Clear output buffer before command
    this.outputBuffer = []

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup()
        reject(new Error(`Command timed out after ${timeoutMs}ms`))
      }, timeoutMs)

      // We detect command completion by looking for the shell prompt
      // The prompt typically ends with "$ " or "# "
      let lastOutputTime = Date.now()
      const promptCheckInterval = 200 // Check every 200ms
      const promptSettleTime = 500 // Wait 500ms after last output for prompt

      const checkForPrompt = () => {
        const fullOutput = this.outputBuffer.join("")

        // Look for shell prompt at the end of output
        // Common patterns: "$ ", "# ", "> ", or ANSI-coded versions
        // Strip ANSI escape codes (ESC [ ... m)
        // biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape codes are control characters by definition
        const trimmed = fullOutput.replace(/\x1b\[[0-9;]*m/g, "")
        const lines = trimmed.split("\n")
        const lastLine = lines[lines.length - 1] ?? ""

        // Check if we have a prompt-like ending
        const hasPrompt = /[$#>]\s*$/.test(lastLine)

        // Also check if enough time has passed since last output
        const timeSinceLastOutput = Date.now() - lastOutputTime

        if (hasPrompt && timeSinceLastOutput >= promptSettleTime) {
          cleanup()

          // Get output excluding the command echo and final prompt
          const outputLines = lines.slice(1, -1) // Remove command line and prompt line
          const output = outputLines.join("\n").trim()

          resolve(output)
        }
      }

      const intervalId = setInterval(checkForPrompt, promptCheckInterval)

      // Track output timing
      const outputHandler = (msg: WsMessage) => {
        if (msg.type === "output") {
          lastOutputTime = Date.now()
        }
      }
      this.messageHandlers.push(outputHandler)

      // Cleanup function
      const cleanup = () => {
        clearTimeout(timeout)
        clearInterval(intervalId)
        this.messageHandlers = this.messageHandlers.filter((h) => h !== outputHandler)
      }

      // Send the command (add newline to execute)
      this.ws?.send(
        JSON.stringify({
          type: "input",
          data: `${command}\n`,
        }),
      )
    })
  }

  /**
   * Destroy the session.
   */
  async destroy(): Promise<void> {
    // Close WebSocket first
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    // Then destroy session via HTTP
    if (this.sessionId) {
      try {
        await fetch(`${this.sandboxUrl}/api/v1/sessions/${this.sessionId}`, {
          method: "DELETE",
          headers: {
            "x-api-key": this.apiKey,
          },
        })

        if (this.verbose) {
          console.log(`[HeadlessValidator] Destroyed session: ${this.sessionId}`)
        }
      } catch (err: unknown) {
        // Ignore errors during cleanup
        if (this.verbose) {
          console.error("[HeadlessValidator] Failed to destroy session:", err)
        }
      }

      this.sessionId = null
    }
  }
}

/**
 * Validate a single snippet.
 */
async function validateSnippet(
  session: SandboxSession,
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

  // For bash/shell snippets, execute the command directly
  if (snippet.language === "bash" || snippet.language === "shell") {
    try {
      if (verbose) {
        console.log(`[HeadlessValidator] Executing: ${snippet.code.substring(0, 50)}...`)
      }

      const output = await session.executeCommand(snippet.code)

      // Check for errors in output
      const errorMsg = detectShellError(output)
      if (errorMsg) {
        return {
          snippet,
          status: "fail",
          output,
          error: errorMsg,
          durationMs: Date.now() - startTime,
        }
      }

      return {
        snippet,
        status: "pass",
        output,
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
    }
  }

  // For Scala/TypeScript, we need different environments (P2 implementation)
  // For now, skip these with a note
  return {
    snippet,
    status: "skipped",
    output: `Validation for ${snippet.language} not yet implemented`,
    durationMs: Date.now() - startTime,
  }
}

/**
 * Validate all snippets for a single step.
 * Creates one session and reuses it for all snippets in the step.
 */
export async function validateStep(
  toolPair: string,
  step: number,
  snippets: readonly ExtractedSnippet[],
  configs: ReadonlyMap<number, ResolvedValidationConfig>,
  options: ValidatorOptions = {},
): Promise<StepValidationResult> {
  const startTime = Date.now()
  const verbose = options.verbose ?? false
  const results: SnippetValidationResult[] = []

  // Get the config for this step (use first snippet's config)
  const firstSnippet = snippets[0]
  if (!firstSnippet) {
    return {
      step,
      toolPair,
      results: [],
      totalDurationMs: Date.now() - startTime,
    }
  }

  const config = configs.get(step)
  if (!config) {
    // No config found, skip all snippets
    for (const snippet of snippets) {
      results.push({
        snippet,
        status: "skipped",
        output: "No validation config found",
        durationMs: 0,
      })
    }
    return {
      step,
      toolPair,
      results,
      totalDurationMs: Date.now() - startTime,
    }
  }

  const session = new SandboxSession(options)

  try {
    // Create and connect to session
    await session.create(toolPair, config.environment)
    await session.connect()

    // Run setup commands from config
    if (config.setup.length > 0) {
      if (verbose) {
        console.log(
          `[HeadlessValidator] Running ${config.setup.length} setup commands for step ${step}`,
        )
      }
      await session.runInitCommands(config.setup)
    }

    // Validate each snippet
    for (const snippet of snippets) {
      const result = await validateSnippet(session, snippet, config, verbose)
      results.push(result)

      if (verbose) {
        const statusIcon = result.status === "pass" ? "+" : result.status === "fail" ? "x" : "-"
        console.log(
          `  [${statusIcon}] ${snippet.file}:${snippet.lineStart} (${snippet.source}${snippet.prop ? `.${snippet.prop}` : ""})`,
        )
      }
    }
  } finally {
    await session.destroy()
  }

  return {
    step,
    toolPair,
    results,
    totalDurationMs: Date.now() - startTime,
  }
}

/**
 * Validate all snippets for a tool pair, grouped by step.
 */
export async function validateToolPair(
  toolPair: string,
  snippets: readonly ExtractedSnippet[],
  configResolver: (step: number) => Promise<ResolvedValidationConfig>,
  options: ValidatorOptions = {},
): Promise<StepValidationResult[]> {
  const stepResults: StepValidationResult[] = []
  const groupedSnippets = groupSnippetsByStep(snippets)

  // Sort steps by number
  const sortedSteps = [...groupedSnippets.keys()].sort((a, b) => a - b)

  // Build config map
  const configs = new Map<number, ResolvedValidationConfig>()
  for (const step of sortedSteps) {
    const config = await configResolver(step)
    configs.set(step, config)
  }

  // Validate each step
  for (const step of sortedSteps) {
    const stepSnippets = groupedSnippets.get(step) ?? []
    const result = await validateStep(toolPair, step, stepSnippets, configs, options)
    stepResults.push(result)
  }

  return stepResults
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
