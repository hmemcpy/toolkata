"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
   * Current sidebar width in pixels.
   */
  readonly sidebarWidth: number

  /**
   * Set the sidebar width.
   */
  readonly setSidebarWidth: (width: number) => void

  /**
   * Session time remaining in seconds, or null if no active session.
   */
  readonly sessionTimeRemaining: number | null

  /**
   * Commands from the current step's MDX frontmatter.
   * Used by InfoPanel to show "Try it" commands.
   */
  readonly contextCommands: readonly string[]

  /**
   * Set the context commands from MDX frontmatter.
   */
  readonly setContextCommands: (commands: readonly string[]) => void


  /**
   * Whether the info panel is collapsed.
   */
  readonly infoPanelCollapsed: boolean

  /**
   * Set the info panel collapsed state.
   */
  readonly setInfoPanelCollapsed: (collapsed: boolean) => void

  /**
   * Height of the info panel as a percentage (0-100).
   */
  readonly infoPanelHeight: number

  /**
   * Set the info panel height percentage.
   */
  readonly setInfoPanelHeight: (height: number) => void

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

  // Step initialization state

  /**
   * The step that has been initialized for this session.
   * Null if no step has been initialized yet.
   */
  readonly sessionInitializedStep: number | null

  /**
   * Whether an initialization sequence is currently running.
   */
  readonly isInitializing: boolean

  /**
   * The command currently being executed during initialization.
   * Null if not initializing.
   */
  readonly currentInitCommand: string | null

  /**
   * Run a sequence of initialization commands.
   *
   * Opens the sidebar, executes commands sequentially with delays,
   * and updates the isInitializing state.
   *
   * @param commands - Array of commands to execute in sequence
   */
  readonly runInitSequence: (commands: readonly string[]) => Promise<void>

  /**
   * Set the initialized step for the session.
   *
   * @param step - The step number that was initialized
   */
  readonly setSessionInitializedStep: (step: number) => void

  /**
   * Clear initialization state (used when session is reset).
   */
  readonly clearInitState: () => void
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
const DEFAULT_SIDEBAR_WIDTH = 400
const DEFAULT_INFO_PANEL_HEIGHT = 30 // percentage
const INIT_STATE_KEY = "sandbox-init-state"
const SIDEBAR_OPEN_KEY = "terminal-sidebar-open"

export function TerminalProvider({ toolPair: _toolPair, children }: TerminalProviderProps) {
  // Sidebar open/closed state with localStorage persistence
  const [isOpen, setIsOpenState] = useState(false)

  // Sidebar width state with localStorage persistence
  const [sidebarWidth, setSidebarWidthState] = useState(DEFAULT_SIDEBAR_WIDTH)

  // Context commands from MDX frontmatter
  const [contextCommands, setContextCommandsState] = useState<readonly string[]>([])

  // Info panel collapsed state with localStorage persistence
  const [infoPanelCollapsed, setInfoPanelCollapsedState] = useState(false)

  // Info panel height percentage with localStorage persistence
  const [infoPanelHeight, setInfoPanelHeightState] = useState(DEFAULT_INFO_PANEL_HEIGHT)

  // Load sidebar state from localStorage on mount
  useEffect(() => {
    const storedOpen = localStorage.getItem(SIDEBAR_OPEN_KEY)
    if (storedOpen) {
      setIsOpenState(storedOpen === "true")
    }

    const storedWidth = localStorage.getItem("terminal-sidebar-width")
    if (storedWidth) {
      setSidebarWidthState(Number(storedWidth))
    }

    const storedCollapsed = localStorage.getItem("terminal-info-panel-collapsed")
    if (storedCollapsed) {
      setInfoPanelCollapsedState(storedCollapsed === "true")
    }

    const storedHeight = localStorage.getItem("terminal-info-panel-height")
    if (storedHeight) {
      setInfoPanelHeightState(Number(storedHeight))
    }
  }, [])

  // Wrapper to save sidebar width to localStorage
  const setSidebarWidth = useCallback((width: number) => {
    setSidebarWidthState(width)
    localStorage.setItem("terminal-sidebar-width", String(width))
  }, [])

  // Wrapper to set context commands
  const setContextCommands = useCallback((commands: readonly string[]) => {
    setContextCommandsState(commands)
  }, [])

  // Wrapper to save info panel collapsed state to localStorage
  const setInfoPanelCollapsed = useCallback((collapsed: boolean) => {
    setInfoPanelCollapsedState(collapsed)
    localStorage.setItem("terminal-info-panel-collapsed", String(collapsed))
  }, [])

  // Wrapper to save info panel height to localStorage
  const setInfoPanelHeight = useCallback((height: number) => {
    setInfoPanelHeightState(height)
    localStorage.setItem("terminal-info-panel-height", String(height))
  }, [])

  // Terminal connection state (managed by InteractiveTerminal via callbacks)
  const [state, setState] = useState<TerminalState>("IDLE")

  // Session time remaining (managed by InteractiveTerminal via callbacks)
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState<number | null>(null)

  // Ref to terminal for imperative operations
  const terminalRef = useRef<TerminalRef | null>(null)

  // Queue for commands sent while terminal is CONNECTING
  const commandQueueRef = useRef<readonly string[]>([])

  // Step initialization state
  const [sessionInitializedStep, setSessionInitializedStepState] = useState<number | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const [currentInitCommand, setCurrentInitCommand] = useState<string | null>(null)

  // Load init state from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const stored = localStorage.getItem(INIT_STATE_KEY)
      if (stored) {
        const step = Number.parseInt(stored, 10)
        if (!Number.isNaN(step)) {
          setSessionInitializedStepState(step)
        }
      }
    } catch {
      // Invalid data, ignore
    }
  }, [])

  /**
   * Open the sidebar.
   */
  const openSidebar = useCallback(() => {
    setIsOpenState(true)
    localStorage.setItem(SIDEBAR_OPEN_KEY, "true")
  }, [])

  /**
   * Close the sidebar.
   */
  const closeSidebar = useCallback(() => {
    setIsOpenState(false)
    localStorage.setItem(SIDEBAR_OPEN_KEY, "false")
  }, [])

  /**
   * Toggle the sidebar open/closed state.
   */
  const toggleSidebar = useCallback(() => {
    setIsOpenState((prev) => {
      const next = !prev
      localStorage.setItem(SIDEBAR_OPEN_KEY, String(next))
      return next
    })
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
        setIsOpenState(true)
        localStorage.setItem(SIDEBAR_OPEN_KEY, "true")
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

  /**
   * Set the initialized step for the session.
   */
  const setSessionInitializedStep = useCallback((step: number) => {
    setSessionInitializedStepState(step)
    if (typeof window !== "undefined") {
      localStorage.setItem(INIT_STATE_KEY, String(step))
    }
  }, [])

  /**
   * Clear initialization state (used when session is reset).
   */
  const clearInitState = useCallback(() => {
    setSessionInitializedStepState(null)
    if (typeof window !== "undefined") {
      localStorage.removeItem(INIT_STATE_KEY)
    }
  }, [])

  /**
   * Run a sequence of initialization commands.
   */
  const runInitSequence = useCallback(
    async (commands: readonly string[]) => {
      if (commands.length === 0) return

      // Open sidebar if closed
      if (!isOpen) {
        setIsOpenState(true)
        localStorage.setItem(SIDEBAR_OPEN_KEY, "true")
      }

      setIsInitializing(true)

      for (const cmd of commands) {
        setCurrentInitCommand(cmd)

        // If terminal is registered and connected, execute immediately
        if (terminalRef.current && (state === "CONNECTED" || state === "TIMEOUT_WARNING")) {
          terminalRef.current.insertCommand(cmd)
        } else {
          // Queue the command for when terminal connects
          commandQueueRef.current = [...commandQueueRef.current, cmd]
        }

        // Wait for command to likely complete
        await new Promise((r) => setTimeout(r, 500))
      }

      setCurrentInitCommand(null)
      setIsInitializing(false)
    },
    [isOpen, state],
  )

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<TerminalContextValue>(
    () => ({
      state,
      isOpen,
      sidebarWidth,
      setSidebarWidth,
      sessionTimeRemaining,
      contextCommands,
      setContextCommands,
      infoPanelCollapsed,
      setInfoPanelCollapsed,
      infoPanelHeight,
      setInfoPanelHeight,
      openSidebar,
      closeSidebar,
      toggleSidebar,
      executeCommand,
      registerTerminal,
      onTerminalStateChange,
      onTerminalTimeChange,
      // Step initialization
      sessionInitializedStep,
      isInitializing,
      currentInitCommand,
      runInitSequence,
      setSessionInitializedStep,
      clearInitState,
    }),
    [
      state,
      isOpen,
      sidebarWidth,
      setSidebarWidth,
      sessionTimeRemaining,
      contextCommands,
      setContextCommands,
      infoPanelCollapsed,
      setInfoPanelCollapsed,
      infoPanelHeight,
      setInfoPanelHeight,
      openSidebar,
      closeSidebar,
      toggleSidebar,
      executeCommand,
      registerTerminal,
      onTerminalStateChange,
      onTerminalTimeChange,
      // Step initialization
      sessionInitializedStep,
      isInitializing,
      currentInitCommand,
      runInitSequence,
      setSessionInitializedStep,
      clearInitState,
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
