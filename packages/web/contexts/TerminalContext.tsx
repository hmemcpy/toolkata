"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import type { TerminalState } from "../components/ui/InteractiveTerminal"

// Re-export TerminalState from InteractiveTerminal for convenience
export type { TerminalState }

/**
 * Imperative handle for terminal operations.
 *
 * Provided by TerminalProvider to allow external components
 * (like TryIt) to execute commands and control the sidebar.
 */
export interface TerminalRef {
  /**
   * Insert a command into the terminal.
   *
   * Writes the command to the terminal display and sends it via WebSocket.
   * If the terminal is not connected, the command is queued until connected.
   *
   * @param command - The command string to execute (e.g., "jj status")
   */
  readonly insertCommand: (command: string) => void

  /**
   * Focus the terminal input.
   *
   * Attempts to focus the terminal for keyboard input.
   */
  readonly focus: () => void

  /**
   * Reset the terminal session.
   *
   * Closes the WebSocket connection, clears the terminal display,
   * and starts a new session.
   */
  readonly reset: () => void
}

/**
 * TerminalContextValue - State and operations exposed by TerminalProvider.
 *
 * Provides terminal state, sidebar open/closed state, and methods
 * to control the sidebar and execute commands from any component.
 *
 * @example
 * ```tsx
 * import { useTerminalContext } from "@/contexts/TerminalContext"
 *
 * export function MyComponent() {
 *   const { state, isOpen, executeCommand, toggleSidebar } = useTerminalContext()
 *
 *   return (
 *     <button onClick={() => executeCommand("jj status")}>
 *       Run jj status
 *     </button>
 *   )
 * }
 * ```
 */
export interface TerminalContextValue {
  /**
   * Current terminal connection state.
   */
  readonly state: TerminalState

  /**
   * Whether the sidebar (or bottom sheet on mobile) is open.
   */
  readonly isOpen: boolean

  /**
   * Session time remaining in seconds, or null if no active session.
   */
  readonly sessionTimeRemaining: number | null

  /**
   * Open the terminal sidebar (or bottom sheet on mobile).
   */
  readonly openSidebar: () => void

  /**
   * Close the terminal sidebar (or bottom sheet on mobile).
   */
  readonly closeSidebar: () => void

  /**
   * Toggle the sidebar open/closed state.
   */
  readonly toggleSidebar: () => void

  /**
   * Execute a command in the terminal.
   *
   * Opens the sidebar if closed, waits for connection if needed,
   * then inserts the command.
   *
   * @param command - The command string to execute
   */
  readonly executeCommand: (command: string) => void

  /**
   * Register a terminal ref for imperative operations.
   *
   * Called by InteractiveTerminal to expose its ref to the context.
   * Components should not call this directly.
   *
   * @internal
   */
  readonly registerTerminal: (ref: TerminalRef | null) => void

  /**
   * Callback when terminal state changes.
   *
   * Called by InteractiveTerminal to notify the context of state changes.
   *
   * @internal
   */
  readonly onTerminalStateChange: (state: TerminalState) => void

  /**
   * Callback when session time remaining changes.
   *
   * Called by InteractiveTerminal to notify the context of timer changes.
   *
   * @internal
   */
  readonly onTerminalTimeChange: (remaining: number | null) => void
}

const TerminalContext = createContext<TerminalContextValue | null>(null)

/**
 * Props for TerminalProvider.
 */
export interface TerminalProviderProps {
  /**
   * The tool pairing slug (e.g., "jj-git").
   * Used to initialize terminal sessions.
   */
  readonly toolPair: string

  /**
   * React children to receive terminal context.
   */
  readonly children: ReactNode
}

/**
 * TerminalProvider - Provides terminal state and operations to all children.
 *
 * Manages:
 * - Sidebar open/closed state
 * - Terminal state (connection status)
 * - Session time remaining
 * - Terminal ref for command execution
 * - Command queuing when terminal is CONNECTING
 *
 * Must be rendered at layout level (within Providers) to persist
 * across step navigation.
 *
 * @example
 * ```tsx
 * // In components/Providers.tsx or app/[toolPair]/layout.tsx
 * import { TerminalProvider } from "@/contexts/TerminalContext"
 *
 * export function App({ toolPair, children }) {
 *   return (
 *     <TerminalProvider toolPair={toolPair}>
 *       {children}
 *     </TerminalProvider>
 *   )
 * }
 * ```
 */
export function TerminalProvider({ toolPair: _toolPair, children }: TerminalProviderProps) {
  // Sidebar open/closed state
  const [isOpen, setIsOpen] = useState(false)

  // Terminal connection state (managed by InteractiveTerminal via callbacks)
  const [state, setState] = useState<TerminalState>("IDLE")

  // Session time remaining (managed by InteractiveTerminal via callbacks)
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState<number | null>(null)

  // Ref to terminal for imperative operations
  const terminalRef = useRef<TerminalRef | null>(null)

  // Queue for commands sent while terminal is CONNECTING
  const commandQueueRef = useRef<readonly string[]>([])

  /**
   * Open the sidebar.
   */
  const openSidebar = useCallback(() => {
    setIsOpen(true)
  }, [])

  /**
   * Close the sidebar.
   */
  const closeSidebar = useCallback(() => {
    setIsOpen(false)
  }, [])

  /**
   * Toggle the sidebar open/closed state.
   */
  const toggleSidebar = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  /**
   * Register a terminal ref for imperative operations.
   *
   * Called by InteractiveTerminal when it mounts/unmounts.
   *
   * @internal
   */
  const registerTerminal = useCallback((ref: TerminalRef | null) => {
    terminalRef.current = ref

    // If terminal just became available and we have queued commands,
    // execute them now.
    if (ref && commandQueueRef.current.length > 0) {
      for (const command of commandQueueRef.current) {
        ref.insertCommand(command)
      }
      commandQueueRef.current = []
    }
  }, [])

  /**
   * Execute a command in the terminal.
   *
   * - Opens sidebar if closed
   * - Queues command if terminal is CONNECTING
   * - Executes immediately if CONNECTED
   */
  const executeCommand = useCallback(
    (command: string) => {
      // Open sidebar if closed
      if (!isOpen) {
        setIsOpen(true)
      }

      // If terminal is registered and connected, execute immediately
      if (terminalRef.current && (state === "CONNECTED" || state === "TIMEOUT_WARNING")) {
        terminalRef.current.insertCommand(command)
        return
      }

      // Otherwise, queue the command for when terminal connects
      commandQueueRef.current = [...commandQueueRef.current, command]
    },
    [isOpen, state],
  )

  /**
   * Callback when terminal state changes.
   *
   * Called by InteractiveTerminal to notify the context of state changes.
   *
   * @internal
   */
  const onTerminalStateChange = useCallback((newState: TerminalState) => {
    setState(newState)
  }, [])

  /**
   * Callback when session time remaining changes.
   *
   * Called by InteractiveTerminal to notify the context of timer changes.
   *
   * @internal
   */
  const onTerminalTimeChange = useCallback((remaining: number | null) => {
    setSessionTimeRemaining(remaining)
  }, [])

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<TerminalContextValue>(
    () => ({
      state,
      isOpen,
      sessionTimeRemaining,
      openSidebar,
      closeSidebar,
      toggleSidebar,
      executeCommand,
      registerTerminal,
      onTerminalStateChange,
      onTerminalTimeChange,
    }),
    [
      state,
      isOpen,
      sessionTimeRemaining,
      openSidebar,
      closeSidebar,
      toggleSidebar,
      executeCommand,
      registerTerminal,
      onTerminalStateChange,
      onTerminalTimeChange,
    ],
  )

  return <TerminalContext.Provider value={value}>{children}</TerminalContext.Provider>
}

/**
 * useTerminalContext - Access terminal state and operations from context.
 *
 * Throws a helpful error if used outside TerminalProvider.
 *
 * @returns TerminalContextValue with state, isOpen, sessionTimeRemaining, and control methods
 * @throws Error if used outside TerminalProvider
 *
 * @example
 * ```tsx
 * import { useTerminalContext } from "@/contexts/TerminalContext"
 *
 * export function TryItButton({ command }: { command: string }) {
 *   const { executeCommand } = useTerminalContext()
 *
 *   return (
 *     <button onClick={() => executeCommand(command)}>
 *       Run {command}
 *     </button>
 *   )
 * }
 * ```
 */
export function useTerminalContext(): TerminalContextValue {
  const context = useContext(TerminalContext)

  if (!context) {
    throw new Error(
      "useTerminalContext must be used within a TerminalProvider. " +
        "Wrap your component tree with <TerminalProvider toolPair={toolPair}>.",
    )
  }

  return context
}
