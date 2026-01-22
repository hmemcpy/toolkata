import { Context, Data, Effect, Layer, Queue } from "effect"
import { ContainerService, ContainerError } from "./container.js"
import type Docker from "dockerode"
import { WebSocket } from "ws"

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
  readonly containerStream: Docker.Exec
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
  readonly message: string
  readonly originalError?: unknown
}> {}

// Service interface
export interface WebSocketServiceShape {
  readonly handleConnection: (
    sessionId: string,
    containerId: string,
    socket: WebSocket,
  ) => Effect.Effect<void, WebSocketError>
  readonly sendMessage: (
    connection: ConnectionState,
    data: string,
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

// Container exec tag for Docker exec operations
export interface ContainerExecShape {
  readonly createExec: (
    containerId: string,
    cmd: string[],
    env: Record<string, string>,
  ) => Effect.Effect<Docker.Exec, ContainerError>
  readonly startExec: (
    exec: Docker.Exec,
    socket: WebSocket,
  ) => Effect.Effect<void, WebSocketError>
  readonly resizeExec: (
    exec: Docker.Exec,
    rows: number,
    cols: number,
  ) => Effect.Effect<void, WebSocketError>
}

export const ContainerExec = Context.GenericTag<ContainerExecShape>(
  "ContainerExec",
)

// Helper: Parse WebSocket message
const _parseMessage = (data: string): WebSocketMessage => {
  try {
    const parsed = JSON.parse(data) as unknown

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "type" in parsed
    ) {
      if (parsed.type === "resize") {
        return {
          type: "resize",
          rows:
            typeof parsed.rows === "number" ? parsed.rows : 24,
          cols:
            typeof parsed.cols === "number" ? parsed.cols : 80,
        } satisfies TerminalResize
      }
      if (parsed.type === "input") {
        return {
          type: "input",
          data: typeof parsed.data === "string" ? parsed.data : "",
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

  // Handle a new WebSocket connection
  const handleConnection = (
    sessionId: string,
    containerId: string,
    socket: WebSocket,
  ) =>
    Effect.gen(function* () {
      // Verify container exists
      const _container = yield* containerService.get(containerId)

      // Create exec for interactive shell
      const exec = yield* Effect.tryPromise({
        try: async () => {
          const _docker = containerService
          // Get Docker client from ContainerService - we need access to it
          // For now, we'll use a workaround through the container
          return null as unknown as Docker.Exec
        },
        catch: (error) => {
          return new ContainerError({
            cause: "DockerUnavailable",
            message:
              error instanceof Error
                ? error.message
                : "Failed to create exec",
            originalError: error,
          })
        },
      })

      // TODO: Set up bidirectional stream
      // This requires more integration with dockerode

      return {
        sessionId,
        containerId,
        socket,
        containerStream: exec,
        isConnected: true,
      } satisfies ConnectionState
    }).pipe(
      Effect.catchAll((error) => {
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
            message:
              error instanceof Error ? error.message : "Unknown error",
            originalError: error,
          }),
        )
      }),
    )

  // Send message to WebSocket client
  const sendMessage = (
    connection: ConnectionState,
    data: string,
  ) =>
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
          message:
            error instanceof Error ? error.message : "Failed to send message",
          originalError: error,
        })
      },
    })

  // Resize terminal
  const resize = (
    connection: ConnectionState,
    rows: number,
    cols: number,
  ) =>
    Effect.tryPromise({
      try: async () => {
        // TODO: Implement exec resize
        // This requires the exec instance to have resize capability
        console.log(
          `[WebSocketService] Resize terminal for ${connection.sessionId}: ${rows}x${cols}`,
        )
      },
      catch: (error) => {
        return new WebSocketError({
          cause: "WriteFailed",
          message:
            error instanceof Error ? error.message : "Failed to resize terminal",
          originalError: error,
        })
      },
    })

  // Close connection gracefully
  const close = (connection: ConnectionState) =>
    Effect.sync(() => {
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
    resize,
    close,
  }
})

// Live layer
export const WebSocketServiceLive = Layer.effect(
  WebSocketService,
  make,
)

// ContainerExec live layer implementation
const makeContainerExec = Effect.gen(function* () {
  const _containerService = yield* ContainerService

  const createExec = (
    _containerId: string,
    _cmd: string[],
    _env: Record<string, string>,
  ) =>
    Effect.tryPromise({
      try: async () => {
        // This needs access to the Docker client
        // For now, return a placeholder
        return null as unknown as Docker.Exec
      },
      catch: (error) => {
        return new ContainerError({
          cause: "DockerUnavailable",
          message:
            error instanceof Error ? error.message : "Failed to create exec",
          originalError: error,
        })
      },
    })

  const startExec = (
    _exec: Docker.Exec,
    _socket: WebSocket,
  ) =>
    Effect.tryPromise({
      try: async () => {
        // TODO: Implement exec start with stream
        console.log("[ContainerExec] Starting exec stream")
      },
      catch: (error) => {
        return new WebSocketError({
          cause: "StreamAttachFailed",
          message:
            error instanceof Error ? error.message : "Failed to start exec",
          originalError: error,
        })
      },
    })

  const resizeExec = (
    _exec: Docker.Exec,
    rows: number,
    cols: number,
  ) =>
    Effect.tryPromise({
      try: async () => {
        // TODO: Implement exec resize
        console.log(`[ContainerExec] Resize: ${rows}x${cols}`)
      },
      catch: (error) => {
        return new WebSocketError({
          cause: "WriteFailed",
          message:
            error instanceof Error ? error.message : "Failed to resize exec",
          originalError: error,
        })
      },
    })

  return { createExec, startExec, resizeExec }
})

export const ContainerExecLive = Layer.effect(
  ContainerExec,
  makeContainerExec,
)

// Helper: Create a queue for streaming terminal output
export const createTerminalStream = (socket: WebSocket) =>
  Effect.gen(function* () {
    // Create the queue
    const queue = yield* Queue.unbounded<string>()

    // Start consuming from queue and sending to socket
    const sendLoop = Effect.repeatForever(
      Queue.take(queue).pipe(
        Effect.flatMap((data) =>
          Effect.tryPromise({
            try: async () => {
              if (socket.readyState === WebSocket.OPEN) {
                socket.send(data)
              }
            },
            catch: (error) => {
              console.error("Failed to send to socket:", error)
            },
          }),
        ),
      ),
    ).pipe(
      Effect.catchAll((error) =>
        Effect.sync(() => {
          console.error("Terminal send loop error:", error)
        }),
      ),
    )

    // Start the loop in background
    yield* Effect.fork(sendLoop)

    return queue
  })
