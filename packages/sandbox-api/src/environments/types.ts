import { Data } from "effect"

// Error types with Data.TaggedClass
export class EnvironmentError extends Data.TaggedClass("EnvironmentError")<{
  readonly cause: "NotFound" | "InvalidConfig" | "NotRegistered"
  readonly message: string
  readonly availableEnvironments?: readonly string[]
}> {}

// Environment configuration
export interface EnvironmentConfig {
  // Unique environment identifier (e.g., "bash", "node", "python")
  readonly name: string

  // Docker image name (e.g., "toolkata-env:bash")
  readonly dockerImage: string

  // Default timeout for init commands (milliseconds)
  readonly defaultTimeout: number

  // Default initialization commands (run silently before user gains control)
  readonly defaultInitCommands: readonly string[]

  // Human-readable description
  readonly description: string

  // Language/tool category (e.g., "shell", "runtime", "vcs")
  readonly category: "shell" | "runtime" | "vcs"
}

// Environment info (returned to API clients)
export interface EnvironmentInfo {
  readonly name: string
  readonly description: string
  readonly category: "shell" | "runtime" | "vcs"
  readonly defaultTimeout: number
}
