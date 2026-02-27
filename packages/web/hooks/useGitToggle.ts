"use client"

import { useCallback, useEffect, useState } from "react"

const STORAGE_KEY = "toolkata-git-toggle"

/**
 * useGitToggle - Standalone hook for git equivalents toggle.
 *
 * Previously part of TerminalContext. Now a simple localStorage boolean.
 * Used by SideBySide and GitToggle components.
 */
export function useGitToggle() {
  const [showGitEquivalents, setShowGitEquivalentsState] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      setShowGitEquivalentsState(stored === "true")
    }
  }, [])

  const setShowGitEquivalents = useCallback((show: boolean) => {
    setShowGitEquivalentsState(show)
    localStorage.setItem(STORAGE_KEY, String(show))
  }, [])

  return { showGitEquivalents, setShowGitEquivalents } as const
}
