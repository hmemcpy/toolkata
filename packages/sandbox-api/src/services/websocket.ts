import type Docker from "dockerode"
import { Context, Data, Effect, Layer } from "effect"
import { WebSocket } from "ws"
import { ContainerError, ContainerService, DockerClient } from "./container.js"

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
  readonly exec: Docker.Exec
  readonly stream: NodeJS.ReadWriteStream
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
        return {
          type: "resize",
          rows: typeof parsed["rows"] === "number" ? parsed["rows"] : 24,
          cols: typeof parsed["cols"] === "number" ? parsed["cols"] : 80,
        } satisfies TerminalResize
      }
      if (msgType === "input") {
        return {
          type: "input",
          data: typeof parsed["data"] === "string" ? parsed["data"] : "",
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
  const dockerClient = yield* DockerClient

  // Handle a new WebSocket connection
  const handleConnection = (sessionId: string, containerId: string, socket: WebSocket) =>
    Effect.gen(function* () {
      // Verify container exists
      const _container = yield* containerService.get(containerId)

      const docker = dockerClient.docker
      const container = docker.getContainer(containerId)

      // Create exec for interactive shell in container
      const exec = yield* Effect.tryPromise({
        try: async () =>
          container.exec({
            AttachStdin: true,
            AttachStdout: true,
            AttachStderr: true,
            Tty: true,
            Cmd: ["/bin/bash"],
            Env: ["TERM=xterm-256color"],
          }),
        catch: (error: unknown) => {
          return new WebSocketError({
            cause: "ExecCreateFailed",
            message: error instanceof Error ? error.message : "Failed to create exec",
            originalError: error,
          })
        },
      })

      // Start the exec and get the stream
      const stream = yield* Effect.tryPromise({
        try: async () => {
          const execStream = await exec.start({
            Detach: false,
            Tty: true,
          })
          return execStream as NodeJS.ReadWriteStream
        },
        catch: (error: unknown) => {
          return new WebSocketError({
            cause: "ExecStartFailed",
            message: error instanceof Error ? error.message : "Failed to start exec",
            originalError: error,
          })
        },
      })

      // Set up pipe from container output to WebSocket
      // Use a FIFO (fake) to avoid blocking issues
      stream.on("data", (chunk: Buffer) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(chunk.toString("utf-8"))
        }
      })

      // Handle stream errors
      stream.on("error", (error) => {
        console.error(`[WebSocketService] Stream error for ${sessionId}:`, error)
        if (socket.readyState === WebSocket.OPEN) {
          socket.close(1011, "Container stream error")
        }
      })

      // Handle stream close
      stream.on("close", () => {
        console.log(`[WebSocketService] Stream closed for ${sessionId}`)
        if (socket.readyState === WebSocket.OPEN) {
          socket.close(1000, "Container process exited")
        }
      })

      return {
        sessionId,
        containerId,
        socket,
        exec,
        stream,
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

  // Write input to container exec stream
  const writeInput = (connection: ConnectionState, data: Buffer) =>
    Effect.tryPromise({
      try: async () => {
        if (!connection.stream.writable) {
          throw new Error("Stream is not writable")
        }
        connection.stream.write(data)
      },
      catch: (error) => {
        return new WebSocketError({
          cause: "WriteFailed",
          message: error instanceof Error ? error.message : "Failed to write to stream",
          originalError: error,
        })
      },
    })

  // Resize terminal
  const resize = (connection: ConnectionState, rows: number, cols: number) =>
    Effect.tryPromise({
      try: async () => {
        await connection.exec.resize({ h: rows, w: cols })
      },
      catch: (error) => {
        return new WebSocketError({
          cause: "WriteFailed",
          message: error instanceof Error ? error.message : "Failed to resize terminal",
          originalError: error,
        })
      },
    })

  // Close connection gracefully
  const close = (connection: ConnectionState) =>
    Effect.sync(() => {
      // Close the stream first
      const stream = connection.stream as NodeJS.ReadWriteStream & {
        destroy?: () => void
        destroyed?: boolean
      }
      if (stream && typeof stream.destroy === "function" && !stream.destroyed) {
        stream.destroy()
      } else if (stream && typeof stream.end === "function") {
        // Fallback to end() if destroy is not available
        stream.end()
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
