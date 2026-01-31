"use client"

import { useCallback } from "react"
import { useTerminalContext } from "../../contexts/TerminalContext"

/**
 * GitToggle component - Toggle button for showing/hiding git equivalent commands.
 *
 * When toggled off (default), SideBySide components show only the jj column at full width.
 * When toggled on, SideBySide components show both git and jj columns side-by-side.
 *
 * The toggle state persists across sessions via localStorage.
 *
 * Follows the terminal aesthetic: minimal, monospace, high contrast.
 */
export function GitToggle() {
  const { showGitEquivalents, setShowGitEquivalents } = useTerminalContext()

  const toggle = useCallback(() => {
    setShowGitEquivalents(!showGitEquivalents)
  }, [showGitEquivalents, setShowGitEquivalents])

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-mono border rounded hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#22c55e] transition-colors"
      style={{
        borderColor: "var(--color-border, #262626)",
        color: "var(--color-text-muted, #a1a1a1)",
      }}
      aria-pressed={showGitEquivalents}
      aria-label={
        showGitEquivalents ? "Hide git equivalent commands" : "Show git equivalent commands"
      }
    >
      {/* Git branch icon */}
      <svg
        width={16}
        height={16}
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        className={showGitEquivalents ? "text-[#f97316]" : "text-[#525252]"}
      >
        <circle cx={3} cy={8} r={2} fill="currentColor" />
        <circle cx={13} cy={3} r={2} fill="currentColor" />
        <circle cx={13} cy={13} r={2} fill="currentColor" />
        <path
          d="M5 8C5 8 6 5 9 5C11 5 11 5 11 5"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <path
          d="M5 8C5 8 6 11 9 11C11 11 11 11 11 11"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      </svg>

      <span>{showGitEquivalents ? "Hide git equivalent" : "Show git equivalent"}</span>

      {/* Toggle indicator */}
      <span
        className="w-4 h-4 rounded-full flex items-center justify-center text-[10px]"
        style={{
          backgroundColor: showGitEquivalents ? "#f97316" : "#262626",
          color: showGitEquivalents ? "#000" : "#525252",
        }}
      >
        {showGitEquivalents ? "ON" : "OFF"}
      </span>
    </button>
  )
}
