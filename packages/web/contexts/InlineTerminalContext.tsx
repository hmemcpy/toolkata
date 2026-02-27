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
import type { SandboxConfig, TerminalState } from "../components/ui/InteractiveTerminal"

export type { TerminalState }

/**
 * Imperative handle for inline terminal operations.
 */
export interface InlineTerminalRef {
  readonly insertCommand: (command: string) => void
  readonly focus: () => void
  readonly reset: () => void
  readonly start: () => void
}

/**
 * InlineTerminalContextValue - State and operations for inline terminal.
 *
 * Slimmed-down context (no sidebar state) for per-step inline terminal.
 */
export interface InlineTerminalContextValue {
  readonly toolPair: string
  readonly state: TerminalState
  readonly errorMessage: string | null
  readonly sessionTimeRemaining: number | null
  readonly sessionId: string | null
  readonly sandboxConfig: SandboxConfig | undefined
  readonly authToken: string | null
  readonly hasUsedTerminal: boolean
  readonly hasInlineTerminal: boolean
  readonly setHasInlineTerminal: (value: boolean) => void

  /**
   * Execute a command in the terminal.
   * Scrolls to terminal, starts it if idle, queues command if connecting.
   */
  readonly executeCommand: (command: string) => void

  /** Reset the terminal session. */
  readonly resetTerminal: () => void

  /** Scroll viewport to the inline terminal. */
  readonly scrollToTerminal: () => void

  /** @internal Register terminal ref. */
  readonly registerTerminal: (ref: InlineTerminalRef | null) => void

  /** @internal Register scroll target element. */
  readonly registerTerminalElement: (el: HTMLElement | null) => void

  /** @internal */
  readonly onTerminalStateChange: (state: TerminalState) => void
  /** @internal */
  readonly onTerminalErrorChange: (error: string | null) => void
  /** @internal */
  readonly onTerminalTimeChange: (remaining: number | null) => void
  /** @internal */
  readonly flushCommandQueue: () => void
  /** @internal */
  readonly onSessionIdChange: (sessionId: string | null) => void
}

const InlineTerminalContext = createContext<InlineTerminalContextValue | null>(null)

export interface InlineTerminalProviderProps {
  readonly toolPair: string
  readonly sandboxConfig?: SandboxConfig | undefined
  readonly authToken: string | null
  readonly children: ReactNode
}

/**
 * InlineTerminalProvider - Per-step terminal context.
 *
 * Unlike TerminalProvider (layout-level, sidebar), this is step-scoped.
 * Each step page gets its own provider and terminal session.
 */
export function InlineTerminalProvider({
  toolPair,
  sandboxConfig,
  authToken,
  children,
}: InlineTerminalProviderProps) {
  const [state, setState] = useState<TerminalState>("IDLE")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState<number | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [hasUsedTerminal, setHasUsedTerminal] = useState(false)
  const [hasInlineTerminal, setHasInlineTerminal] = useState(false)

  const terminalRef = useRef<InlineTerminalRef | null>(null)
  const terminalElementRef = useRef<HTMLElement | null>(null)
  const commandQueueRef = useRef<readonly string[]>([])

  const registerTerminal = useCallback((ref: InlineTerminalRef | null) => {
    terminalRef.current = ref
  }, [])

  const registerTerminalElement = useCallback((el: HTMLElement | null) => {
    terminalElementRef.current = el
  }, [])

  const scrollToTerminal = useCallback(() => {
    terminalElementRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [])

  const executeCommand = useCallback(
    (command: string) => {
      // Mark terminal as used for soft gate
      setHasUsedTerminal(true)

      // Scroll to terminal
      scrollToTerminal()

      // If connected, execute immediately
      if (terminalRef.current && (state === "CONNECTED" || state === "TIMEOUT_WARNING")) {
        terminalRef.current.insertCommand(command)
        return
      }

      // Start terminal if idle
      if (state === "IDLE" && terminalRef.current) {
        commandQueueRef.current = [...commandQueueRef.current, command]
        terminalRef.current.start()
      } else if (state === "EXPIRED" && terminalRef.current) {
        commandQueueRef.current = [command]
        terminalRef.current.reset()
      } else {
        commandQueueRef.current = [...commandQueueRef.current, command]
      }
    },
    [state, scrollToTerminal],
  )

  const resetTerminal = useCallback(() => {
    terminalRef.current?.reset()
  }, [])

  const onTerminalStateChange = useCallback((newState: TerminalState) => {
    setState(newState)
    if (newState === "CONNECTED" || newState === "TIMEOUT_WARNING") {
      setHasUsedTerminal(true)
    }
  }, [])

  const onTerminalErrorChange = useCallback((error: string | null) => {
    setErrorMessage(error)
  }, [])

  const onTerminalTimeChange = useCallback((remaining: number | null) => {
    setSessionTimeRemaining(remaining)
  }, [])

  const flushCommandQueue = useCallback(() => {
    if (terminalRef.current && commandQueueRef.current.length > 0) {
      for (const command of commandQueueRef.current) {
        terminalRef.current.insertCommand(command)
      }
      commandQueueRef.current = []
    }
  }, [])

  const onSessionIdChange = useCallback((id: string | null) => {
    setSessionId(id)
  }, [])

  const value = useMemo<InlineTerminalContextValue>(
    () => ({
      toolPair,
      state,
      errorMessage,
      sessionTimeRemaining,
      sessionId,
      sandboxConfig,
      authToken,
      hasUsedTerminal,
      hasInlineTerminal,
      setHasInlineTerminal,
      executeCommand,
      resetTerminal,
      scrollToTerminal,
      registerTerminal,
      registerTerminalElement,
      onTerminalStateChange,
      onTerminalErrorChange,
      onTerminalTimeChange,
      flushCommandQueue,
      onSessionIdChange,
    }),
    [
      toolPair,
      state,
      errorMessage,
      sessionTimeRemaining,
      sessionId,
      sandboxConfig,
      authToken,
      hasUsedTerminal,
      hasInlineTerminal,
      executeCommand,
      resetTerminal,
      scrollToTerminal,
      registerTerminal,
      registerTerminalElement,
      onTerminalStateChange,
      onTerminalErrorChange,
      onTerminalTimeChange,
      flushCommandQueue,
      onSessionIdChange,
    ],
  )

  return <InlineTerminalContext.Provider value={value}>{children}</InlineTerminalContext.Provider>
}

/**
 * useInlineTerminal - Access inline terminal state and operations.
 */
export function useInlineTerminal(): InlineTerminalContextValue {
  const context = useContext(InlineTerminalContext)

  if (!context) {
    throw new Error(
      "useInlineTerminal must be used within an InlineTerminalProvider. " +
        "Wrap your component tree with <InlineTerminalProvider>.",
    )
  }

  return context
}
