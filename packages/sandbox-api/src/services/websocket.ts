import { platform } from "node:os"
import { Context, Data, Effect, Layer } from "effect"
import { WebSocket } from "ws"
import { ContainerError, ContainerService } from "./container.js"

// Detect platform for script command syntax
const isMacOS = platform() === "darwin"

// Bun subprocess with terminal
interface BunTerminalProcess {
  readonly terminal: {
    write(data: string): number
    resize(cols: number, rows: number): void
    close(): void
  }
  readonly exited: Promise<number>
  kill(signal?: number): void
}

// Terminal resize event from client
export interface TerminalResize {
  readonly type: "resize"
  readonly rows: number
  readonly cols: number
}

// Terminal input from client
export interface TerminalInput {
  readonly type: "input"
  readonly data: string
}

// Init command message (runs silently before user gains control)
export interface InitCommands {
  readonly type: "init"
  readonly commands: readonly string[]
  readonly timeout?: number
  readonly silent?: boolean
}

// Messages from WebSocket client
export type WebSocketMessage = TerminalInput | TerminalResize | InitCommands

// WebSocket connection state
export interface ConnectionState {
  readonly sessionId: string
  readonly containerId: string
  readonly socket: WebSocket
  readonly bunProcess: BunTerminalProcess
  readonly isConnected: boolean
}

// Error types
export class WebSocketError extends Data.TaggedClass("WebSocketError")<{
  readonly cause:
    | "ConnectionFailed"
    | "StreamAttachFailed"
    | "InvalidMessage"
    | "ContainerNotFound"
    | "WriteFailed"
    | "SocketClosed"
    | "ExecCreateFailed"
    | "ExecStartFailed"
  readonly message: string
  readonly originalError?: unknown
}> {}

// Service interface
export interface WebSocketServiceShape {
  readonly handleConnection: (
    sessionId: string,
    containerId: string,
    socket: WebSocket,
    initialCols?: number,
    initialRows?: number,
  ) => Effect.Effect<ConnectionState, WebSocketError>
  readonly sendMessage: (
    connection: ConnectionState,
    data: string,
  ) => Effect.Effect<void, WebSocketError>
  readonly writeInput: (
    connection: ConnectionState,
    data: Buffer,
  ) => Effect.Effect<void, WebSocketError>
  readonly resize: (
    connection: ConnectionState,
    rows: number,
    cols: number,
  ) => Effect.Effect<void, WebSocketError>
  readonly executeInitCommands: (
    connection: ConnectionState,
    commands: readonly string[],
    timeout?: number,
    silent?: boolean,
  ) => Effect.Effect<void, WebSocketError>
  readonly close: (connection: ConnectionState) => Effect.Effect<void, never>
}

// Service tag
export class WebSocketService extends Context.Tag("WebSocketService")<
  WebSocketService,
  WebSocketServiceShape
>() {}

// Helper: Parse WebSocket message
const _parseMessage = (data: string): WebSocketMessage => {
  try {
    const parsed = JSON.parse(data) as Record<string, unknown>

    if (typeof parsed === "object" && parsed !== null && "type" in parsed) {
      const msgType = parsed["type"]
      if (msgType === "resize") {
        const rows = typeof parsed["rows"] === "number" ? parsed["rows"] : 24
        const cols = typeof parsed["cols"] === "number" ? parsed["cols"] : 80
        return {
          type: "resize",
          rows,
          cols,
        } satisfies TerminalResize
      }
      if (msgType === "input") {
        const inputData = typeof parsed["data"] === "string" ? parsed["data"] : ""
        return {
          type: "input",
          data: inputData,
        } satisfies TerminalInput
      }
      if (msgType === "init") {
        const commands = Array.isArray(parsed["commands"])
          ? (parsed["commands"] as readonly string[])
          : []
        const result: InitCommands = {
          type: "init",
          commands,
        }
        // Only add optional properties if they have valid values (exactOptionalPropertyTypes)
        if (typeof parsed["timeout"] === "number") {
          ;(result as { timeout?: number }).timeout = parsed["timeout"]
        }
        if (typeof parsed["silent"] === "boolean") {
          ;(result as { silent?: boolean }).silent = parsed["silent"]
        }
        return result
      }
    }

    // Default: treat as raw input
    return { type: "input", data }
  } catch {
    // Not JSON, treat as raw input
    return { type: "input", data }
  }
}

// Track output suppression state per session (for silent init commands)
const suppressionState = new Map<string, boolean>()

// Service implementation
const make = Effect.gen(function* () {
  const containerService = yield* ContainerService
  // Note: dockerClient not needed with CLI approach

  // Handle a new WebSocket connection using docker exec CLI
  const handleConnection = (
    sessionId: string,
    containerId: string,
    socket: WebSocket,
    initialCols = 80,
    initialRows = 24,
  ) =>
    Effect.gen(function* () {
      // Verify container exists before connecting
      yield* containerService.get(containerId)

      // Use Bun's native PTY support with docker exec -it
      // The -t flag is needed for docker to allocate a TTY that bash can detect
      // Note: macOS and Linux have different `script` command syntax
      const scriptArgs = isMacOS
        ? [
            "script",
            "-q",
            "/dev/null",
            "docker",
            "exec",
            "-it",
            "-e",
            "HOME=/home/toolkata",
            "-w",
            "/home/toolkata",
            "--user",
            "sandbox",
            containerId,
            "/bin/bash",
            "--rcfile",
            "/home/toolkata/.bashrc",
            "-i",
          ]
        : [
            "script",
            "-q",
            "--echo",
            "never",
            "-c",
            `docker exec -it -e HOME=/home/toolkata -w /home/toolkata --user sandbox ${containerId} /bin/bash --init-file /home/toolkata/.bashrc -i`,
            "/dev/null",
          ]

      // Initialize suppression state for this session
      suppressionState.set(sessionId, false)

      const bunProcess = Bun.spawn(scriptArgs, {
        env: {
          ...process.env,
          TERM: "xterm-256color",
          LANG: "en_US.UTF-8",
          LC_ALL: "en_US.UTF-8",
        },
        terminal: {
          cols: initialCols,
          rows: initialRows,
          data(_terminal, data) {
            // Check suppression state before sending output
            if (suppressionState.get(sessionId)) {
              return // Skip output when suppressed (silent init commands)
            }
            if (socket.readyState === WebSocket.OPEN) {
              const text = new TextDecoder().decode(data)
              socket.send(text)
            }
          },
          exit(_terminal, exitCode) {
            console.log(`[WebSocketService] PTY exited for ${sessionId} with code ${exitCode}`)
            if (socket.readyState === WebSocket.OPEN) {
              socket.close(1000, "Container process exited")
            }
          },
        },
      }) as unknown as BunTerminalProcess

      console.log(`[WebSocketService] Spawned Bun PTY for ${sessionId}`)

      // Handle process exit
      bunProcess.exited.then((code) => {
        console.log(`[WebSocketService] Process exited for ${sessionId} with code ${code}`)
      })

      return {
        sessionId,
        containerId,
        socket,
        bunProcess,
        isConnected: true,
      } satisfies ConnectionState
    }).pipe(
      Effect.catchAll((error: unknown) => {
        if (error instanceof WebSocketError) {
          return Effect.fail(error)
        }
        if (error instanceof ContainerError) {
          return Effect.fail(
            new WebSocketError({
              cause: error.cause === "NotFoundError" ? "ContainerNotFound" : "StreamAttachFailed",
              message: error.message,
              originalError: error,
            }),
          )
        }
        return Effect.fail(
          new WebSocketError({
            cause: "ConnectionFailed",
            message: error instanceof Error ? error.message : "Unknown error",
            originalError: error,
          }),
        )
      }),
    )

  // Send message to WebSocket client
  const sendMessage = (connection: ConnectionState, data: string) =>
    Effect.tryPromise({
      try: async () => {
        if (connection.socket.readyState === WebSocket.OPEN) {
          connection.socket.send(data)
        } else {
          throw new Error("Socket is not open")
        }
      },
      catch: (error) => {
        return new WebSocketError({
          cause: "SocketClosed",
          message: error instanceof Error ? error.message : "Failed to send message",
          originalError: error,
        })
      },
    })

  // Write input to terminal
  const writeInput = (connection: ConnectionState, data: Buffer) =>
    Effect.sync(() => {
      connection.bunProcess.terminal.write(data.toString("utf-8"))
    })

  // Resize terminal
  const resize = (connection: ConnectionState, rows: number, cols: number) =>
    Effect.sync(() => {
      connection.bunProcess.terminal.resize(cols, rows)
    })

  // Execute init commands (optionally silent - without sending output to client)
  const executeInitCommands = (
    connection: ConnectionState,
    commands: readonly string[],
    timeout = 30000, // Default 30 seconds
    silent = false,
  ) =>
    Effect.gen(function* () {
      // Send initComplete even for empty commands
      if (commands.length === 0) {
        yield* sendMessage(
          connection,
          JSON.stringify({ type: "initComplete", success: true }),
        )
        return
      }

      console.log(
        `[WebSocketService] Executing ${commands.length} init commands for ${connection.sessionId} (silent: ${silent})`,
      )

      // Enable output suppression if silent mode requested
      if (silent) {
        suppressionState.set(connection.sessionId, true)
      }

      try {
        // Execute each command
        for (const command of commands) {
          const commandWithNewline = command.endsWith("\n") ? command : `${command}\n`

          // Write command to terminal
          connection.bunProcess.terminal.write(commandWithNewline)

          // Wait for command to complete (simple delay - in production would monitor PTY output)
          // For now, we use a timeout to prevent hanging
          yield* Effect.sleep("200 millis")
        }

        console.log(`[WebSocketService] Init commands completed for ${connection.sessionId}`)

        // Disable output suppression before sending completion message
        if (silent) {
          suppressionState.set(connection.sessionId, false)
        }

        // Send initComplete success message
        yield* sendMessage(
          connection,
          JSON.stringify({ type: "initComplete", success: true }),
        )
      } catch (error) {
        // Disable output suppression on error too
        if (silent) {
          suppressionState.set(connection.sessionId, false)
        }

        // Send initComplete failure message with error details
        const errorMessage = error instanceof Error ? error.message : String(error)
        yield* sendMessage(
          connection,
          JSON.stringify({ type: "initComplete", success: false, error: errorMessage }),
        )
        throw error
      }
    }).pipe(
      Effect.timeout(`${timeout} millis`),
      Effect.catchAll((error) => {
        // Ensure suppression is disabled on any failure
        suppressionState.set(connection.sessionId, false)

        // Send initComplete failure if not already sent
        if (connection.socket.readyState === WebSocket.OPEN) {
          connection.socket.send(
            JSON.stringify({
              type: "initComplete",
              success: false,
              error: `Init commands timed out after ${timeout}ms`,
            }),
          )
        }

        return Effect.fail(
          new WebSocketError({
            cause: "WriteFailed",
            message:
              error instanceof Error ? error.message : `Init commands timed out after ${timeout}ms`,
          }),
        )
      }),
    )

  // Close connection gracefully
  const close = (connection: ConnectionState) =>
    Effect.sync(() => {
      // Clean up suppression state
      suppressionState.delete(connection.sessionId)

      // Close the PTY terminal
      try {
        connection.bunProcess.terminal.close()
      } catch {
        // Terminal may already be closed
      }

      // Kill the process if still running
      try {
        connection.bunProcess.kill()
      } catch {
        // Process may already be exited
      }

      // Close the WebSocket
      if (
        connection.socket.readyState === WebSocket.OPEN ||
        connection.socket.readyState === WebSocket.CONNECTING
      ) {
        connection.socket.close(1000, "Normal closure")
      }
    })

  return {
    handleConnection,
    sendMessage,
    writeInput,
    resize,
    executeInitCommands,
    close,
  }
})

// Live layer
export const WebSocketServiceLive = Layer.effect(WebSocketService, make)

// Helper: Parse WebSocket message
export const parseMessage = (data: string | Buffer): WebSocketMessage => {
  const str = data instanceof Buffer ? data.toString("utf-8") : (data as string)
  return _parseMessage(str)
}
