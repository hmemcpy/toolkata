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
import type { SandboxConfig, TerminalState } from "../components/ui/InteractiveTerminal"

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

  /**
   * Start the terminal session.
   *
   * Initiates connection to the sandbox if in IDLE state.
   */
  readonly start: () => void
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
   * Current error message, or null if no error.
   */
  readonly errorMessage: string | null

  /**
   * Whether the sidebar (or bottom sheet on mobile) is open.
   */
  readonly isOpen: boolean

  /**
   * Element that triggered opening the sidebar.
   * Used to restore focus when sidebar closes.
   */
  readonly triggerRef: React.RefObject<HTMLElement | null>

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
   * Current sandbox session ID, or null if no active session.
   * Used by kata validation to run commands against the user's terminal state.
   */
  readonly sessionId: string | null

  /**
   * Current sandbox configuration for the active step.
   */
  readonly sandboxConfig: SandboxConfig | undefined

  /**
   * Set the sandbox configuration (triggers re-init if changed).
   */
  readonly setSandboxConfig: (config: SandboxConfig | undefined) => void

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
   * Whether to show git equivalent commands in SideBySide components.
   * When false, only the jj column is shown (full width).
   */
  readonly showGitEquivalents: boolean

  /**
   * Set the show git equivalents state.
   */
  readonly setShowGitEquivalents: (show: boolean) => void

  /**
   * Open the terminal sidebar (or bottom sheet on mobile).
   *
   * @param trigger - Optional element that triggered opening (for focus return).
   */
  readonly openSidebar: (trigger?: HTMLElement | null) => void

  /**
   * Close the terminal sidebar (or bottom sheet on mobile).
   */
  readonly closeSidebar: () => void

  /**
   * Toggle the sidebar open/closed state.
   *
   * @param trigger - Optional element that triggered opening (for focus return).
   */
  readonly toggleSidebar: (trigger?: HTMLElement | null) => void

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
   * Callback when terminal error message changes.
   *
   * Called by InteractiveTerminal to notify the context of error messages.
   *
   * @internal
   */
  readonly onTerminalErrorChange: (error: string | null) => void

  /**
   * Callback when session time remaining changes.
   *
   * Called by InteractiveTerminal to notify the context of timer changes.
   *
   * @internal
   */
  readonly onTerminalTimeChange: (remaining: number | null) => void

  /**
   * Flush any queued commands to the terminal.
   *
   * Called when the PTY is ready to receive commands.
   *
   * @internal
   */
  readonly flushCommandQueue: () => void

  /**
   * Callback when session ID changes.
   *
   * Called by InteractiveTerminal when session is created or destroyed.
   * Used by kata validation to access the active session.
   *
   * @param sessionId - The session ID (null when session is destroyed)
   *
   * @internal
   */
  readonly onSessionIdChange: (sessionId: string | null) => void
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
const SIDEBAR_OPEN_KEY = "terminal-sidebar-open"

export function TerminalProvider({ toolPair: _toolPair, children }: TerminalProviderProps) {
  // Sidebar open/closed state with localStorage persistence
  const [isOpen, setIsOpenState] = useState(false)

  // Sidebar width state with localStorage persistence
  const [sidebarWidth, setSidebarWidthState] = useState(DEFAULT_SIDEBAR_WIDTH)

  // Context commands from MDX frontmatter
  const [contextCommands, setContextCommandsState] = useState<readonly string[]>([])

  // Sandbox config for current step
  const [sandboxConfig, setSandboxConfigState] = useState<SandboxConfig | undefined>(undefined)
  const previousSandboxConfigRef = useRef<SandboxConfig | undefined>(undefined)

  // Info panel collapsed state with localStorage persistence
  const [infoPanelCollapsed, setInfoPanelCollapsedState] = useState(false)

  // Info panel height percentage with localStorage persistence
  const [infoPanelHeight, setInfoPanelHeightState] = useState(DEFAULT_INFO_PANEL_HEIGHT)

  // Show git equivalents toggle with localStorage persistence (default false)
  const [showGitEquivalents, setShowGitEquivalentsState] = useState(false)

  // Terminal connection state (managed by InteractiveTerminal via callbacks)
  const [state, setState] = useState<TerminalState>("IDLE")

  // Error message (managed by InteractiveTerminal via callbacks)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Session time remaining (managed by InteractiveTerminal via callbacks)
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState<number | null>(null)

  // Session ID (managed by InteractiveTerminal via callbacks)
  const [sessionId, setSessionId] = useState<string | null>(null)

  // Ref to terminal for imperative operations
  const terminalRef = useRef<TerminalRef | null>(null)

  // Ref to element that triggered opening the sidebar (for focus return)
  const triggerRef = useRef<HTMLElement | null>(null)

  // Queue for commands sent while terminal is CONNECTING
  const commandQueueRef = useRef<readonly string[]>([])

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

    const storedShowGitEquivalents = localStorage.getItem("toolkata-git-toggle")
    if (storedShowGitEquivalents) {
      setShowGitEquivalentsState(storedShowGitEquivalents === "true")
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

  /**
   * Set sandbox config and trigger re-initialization if changed.
   *
   * Compares the new config with the previous one to detect changes in:
   * - enabled status
   * - environment
   * - init commands
   * - timeout
   *
   * If any of these change, the terminal session is reset to apply the new config.
   */
  const setSandboxConfig = useCallback(
    (newConfig: SandboxConfig | undefined) => {
      const previous = previousSandboxConfigRef.current

      // Check if config changed in meaningful ways
      const configChanged =
        !previous !== !newConfig ||
        (previous &&
          newConfig &&
          (previous.enabled !== newConfig.enabled ||
            previous.environment !== newConfig.environment ||
            previous.timeout !== newConfig.timeout ||
            JSON.stringify(previous.init) !== JSON.stringify(newConfig.init)))

      setSandboxConfigState(newConfig)
      previousSandboxConfigRef.current = newConfig

      // If config changed and terminal is active, reset to apply new config
      if (configChanged && terminalRef.current) {
        const currentState = state
        if (currentState === "CONNECTED" || currentState === "TIMEOUT_WARNING") {
          // Reset terminal to start fresh session with new config
          terminalRef.current.reset()
        }
      }
    },
    [state],
  )

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

  // Wrapper to save show git equivalents state to localStorage
  const setShowGitEquivalents = useCallback((show: boolean) => {
    setShowGitEquivalentsState(show)
    localStorage.setItem("toolkata-git-toggle", String(show))
  }, [])

  /**
   * Open the sidebar.
   */
  const openSidebar = useCallback((trigger?: HTMLElement | null) => {
    // Store trigger element for focus return when sidebar closes
    if (trigger) {
      triggerRef.current = trigger
    }
    setIsOpenState(true)
    localStorage.setItem(SIDEBAR_OPEN_KEY, "true")
  }, [])

  /**
   * Close the sidebar.
   *
   * Returns focus to the trigger element if one was stored.
   */
  const closeSidebar = useCallback(() => {
    setIsOpenState(false)
    localStorage.setItem(SIDEBAR_OPEN_KEY, "false")

    // Return focus to trigger element after a small delay
    // to allow sidebar close animation to start
    setTimeout(() => {
      if (triggerRef.current) {
        triggerRef.current.focus()
        triggerRef.current = null
      }
    }, 50)
  }, [])

  /**
   * Toggle the sidebar open/closed state.
   */
  const toggleSidebar = useCallback((trigger?: HTMLElement | null) => {
    setIsOpenState((prev) => {
      const next = !prev

      // Store trigger element when opening
      if (next && trigger) {
        triggerRef.current = trigger
      }

      // Return focus to trigger when closing
      if (!next) {
        setTimeout(() => {
          if (triggerRef.current) {
            triggerRef.current.focus()
            triggerRef.current = null
          }
        }, 50)
      }

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
  const registerTerminal = useCallback(
    (ref: TerminalRef | null) => {
      terminalRef.current = ref

      // If terminal just became available and we have queued commands
      if (ref && commandQueueRef.current.length > 0) {
        if (state === "IDLE") {
          // If idle, start the terminal (commands will be sent when connected)
          ref.start()
        }
      }
    },
    [state],
  )

  /**
   * Execute a command in the terminal.
   *
   * - Opens sidebar if closed
   * - Starts terminal if IDLE
   * - Queues command if terminal is CONNECTING
   * - Executes immediately if CONNECTED
   */
  const executeCommand = useCallback(
    (command: string) => {
      // Open sidebar if closed, capturing current active element as trigger
      if (!isOpen) {
        const activeElement = document.activeElement as HTMLElement | null
        if (activeElement) {
          triggerRef.current = activeElement
        }
        setIsOpenState(true)
        localStorage.setItem(SIDEBAR_OPEN_KEY, "true")
      }

      // If terminal is registered and connected, execute immediately
      if (terminalRef.current && (state === "CONNECTED" || state === "TIMEOUT_WARNING")) {
        terminalRef.current.insertCommand(command)
        return
      }

      // Start terminal if idle or expired (expired needs a fresh session)
      if (state === "IDLE" && terminalRef.current) {
        // Queue the command for when terminal connects
        commandQueueRef.current = [...commandQueueRef.current, command]
        terminalRef.current.start()
      } else if (state === "EXPIRED" && terminalRef.current) {
        // Clear old queue and only queue this command when expired
        commandQueueRef.current = [command]
        terminalRef.current.reset()
      } else {
        // Queue the command for when terminal connects
        commandQueueRef.current = [...commandQueueRef.current, command]
      }
    },
    [isOpen, state],
  )

  /**
   * Callback when terminal state changes.
   *
   * Called by InteractiveTerminal to notify the context of state changes.
   * Also flushes any queued commands when terminal becomes connected.
   *
   * @internal
   */
  const onTerminalStateChange = useCallback((newState: TerminalState) => {
    setState(newState)

    // NOTE: We don't flush queued commands here anymore.
    // Instead, commands are flushed when the PTY is ready (onPtyReady).
    // This prevents sending commands before the PTY is initialized.
  }, [])

  /**
   * Callback when terminal error message changes.
   *
   * Called by InteractiveTerminal to notify the context of error messages.
   *
   * @internal
   */
  const onTerminalErrorChange = useCallback((error: string | null) => {
    setErrorMessage(error)
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
   * Flush any queued commands to the terminal.
   *
   * Called when the PTY is ready to receive commands.
   *
   * @internal
   */
  const flushCommandQueue = useCallback(() => {
    if (terminalRef.current && commandQueueRef.current.length > 0) {
      for (const command of commandQueueRef.current) {
        terminalRef.current.insertCommand(command)
      }
      commandQueueRef.current = []
    }
  }, [])

  /**
   * Callback when session ID changes.
   *
   * Called by InteractiveTerminal when session is created or destroyed.
   * Used by kata validation to access the active session.
   *
   * @internal
   */
  const onSessionIdChange = useCallback((id: string | null) => {
    setSessionId(id)
  }, [])

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<TerminalContextValue>(
    () => ({
      state,
      errorMessage,
      isOpen,
      triggerRef,
      sidebarWidth,
      setSidebarWidth,
      sessionTimeRemaining,
      sessionId,
      sandboxConfig,
      setSandboxConfig,
      contextCommands,
      setContextCommands,
      infoPanelCollapsed,
      setInfoPanelCollapsed,
      infoPanelHeight,
      setInfoPanelHeight,
      showGitEquivalents,
      setShowGitEquivalents,
      openSidebar,
      closeSidebar,
      toggleSidebar,
      executeCommand,
      registerTerminal,
      onTerminalStateChange,
      onTerminalErrorChange,
      onTerminalTimeChange,
      flushCommandQueue,
      onSessionIdChange,
    }),
    [
      state,
      errorMessage,
      isOpen,
      sidebarWidth,
      setSidebarWidth,
      sessionTimeRemaining,
      sessionId,
      sandboxConfig,
      setSandboxConfig,
      contextCommands,
      setContextCommands,
      infoPanelCollapsed,
      setInfoPanelCollapsed,
      infoPanelHeight,
      setInfoPanelHeight,
      showGitEquivalents,
      setShowGitEquivalents,
      openSidebar,
      closeSidebar,
      toggleSidebar,
      executeCommand,
      flushCommandQueue,
      onSessionIdChange,
      registerTerminal,
      onTerminalStateChange,
      onTerminalErrorChange,
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
