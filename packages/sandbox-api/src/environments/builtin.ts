import type { EnvironmentConfig } from "./types.js"

/**
 * Built-in environment configurations
 *
 * These are the default environments available in toolkata.
 * Additional environments can be added via the plugins directory.
 */

// Base bash environment - shell only, for git/jj lessons
export const bashEnvironment: EnvironmentConfig = {
  name: "bash",
  dockerImage: "toolkata-env:bash",
  defaultTimeout: 60000, // 60 seconds
  defaultInitCommands: [],
  description: "Bash shell with git and jj (Jujutsu VCS) installed",
  category: "shell",
} as const

// Node.js environment - for JavaScript/TypeScript lessons
export const nodeEnvironment: EnvironmentConfig = {
  name: "node",
  dockerImage: "toolkata-env:node",
  defaultTimeout: 120000, // 120 seconds (npm install can take longer)
  defaultInitCommands: [],
  description: "Node.js LTS runtime with npm",
  category: "runtime",
} as const

// Python environment - for Python lessons
export const pythonEnvironment: EnvironmentConfig = {
  name: "python",
  dockerImage: "toolkata-env:python",
  defaultTimeout: 120000, // 120 seconds (pip install can take longer)
  defaultInitCommands: [],
  description: "Python 3 with pip",
  category: "runtime",
} as const

// Scala environment - for Scala functional programming lessons
export const scalaEnvironment: EnvironmentConfig = {
  name: "scala",
  dockerImage: "toolkata-env:scala",
  defaultTimeout: 120000, // 120 seconds (scala-cli compile can take longer)
  defaultInitCommands: [],
  description: "Scala 3 with scala-cli and pre-cached ZIO/Cats Effect libraries",
  category: "runtime",
} as const

// TypeScript environment - for TypeScript/Effect lessons
export const typescriptEnvironment: EnvironmentConfig = {
  name: "typescript",
  dockerImage: "toolkata-env:typescript",
  defaultTimeout: 60000, // 60 seconds (tsc --noEmit is fast)
  defaultInitCommands: [],
  description: "Node.js 22 with tsx, typescript, and effect package pre-installed",
  category: "runtime",
} as const

// tmux environment - for tmux terminal multiplexer tutorials
export const tmuxEnvironment: EnvironmentConfig = {
  name: "tmux",
  dockerImage: "toolkata-env:tmux",
  defaultTimeout: 120000, // 120 seconds (tmux sessions can take longer)
  defaultInitCommands: [],
  description: "Bash shell with tmux terminal multiplexer installed",
  category: "shell",
  disableGvisor: true, // tmux needs proper PTY support (gVisor doesn't support nested PTY)
} as const

// Registry of all built-in environments
export const builtinEnvironments: readonly EnvironmentConfig[] = [
  bashEnvironment,
  nodeEnvironment,
  pythonEnvironment,
  scalaEnvironment,
  typescriptEnvironment,
  tmuxEnvironment,
] as const

// Helper: Get environment by name
export const getBuiltinEnvironment = (name: string): EnvironmentConfig | undefined => {
  return builtinEnvironments.find((env) => env.name === name)
}

// Helper: Check if environment name is a built-in
export const isBuiltinEnvironment = (name: string): boolean => {
  return builtinEnvironments.some((env) => env.name === name)
}

// Helper: List all built-in environment names
export const listBuiltinEnvironmentNames = (): readonly string[] => {
  return builtinEnvironments.map((env) => env.name)
}
