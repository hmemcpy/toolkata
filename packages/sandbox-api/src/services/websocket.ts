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

// Messages from WebSocket client
export type WebSocketMessage = TerminalInput | TerminalResize

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
    }

    // Default: treat as raw input
    return { type: "input", data }
  } catch {
    // Not JSON, treat as raw input
    return { type: "input", data }
  }
}

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
            "--user",
            "sandbox",
            containerId,
            "/bin/bash",
            "-l",
          ]
        : [
            "script",
            "-q",
            "-c",
            `docker exec -it --user sandbox ${containerId} /bin/bash -l`,
            "/dev/null",
          ]

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
          data(_terminal: unknown, data: Uint8Array) {
            if (socket.readyState === WebSocket.OPEN) {
              // Convert Uint8Array to string for WebSocket transmission
              const text = new TextDecoder().decode(data)
              socket.send(text)
            }
          },
          exit(_terminal: unknown, exitCode: number) {
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

  // Close connection gracefully
  const close = (connection: ConnectionState) =>
    Effect.sync(() => {
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
