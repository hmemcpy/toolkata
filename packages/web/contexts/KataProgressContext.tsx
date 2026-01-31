"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

// Schema version for future migrations
const STORAGE_KEY = "toolkata_kata_progress"
const SCHEMA_VERSION = 1
const USER_ID_KEY = "toolkata_user_id"

/**
 * Statistics for a completed Kata.
 */
export interface KataStat {
  readonly completedAt: string // ISO timestamp
  readonly attempts: number // Validation attempts before success
  readonly exercisesCompleted: readonly string[] // ["1.1", "1.2", ...]
  readonly exerciseAttempts: Record<string, number> // Attempts per exercise ID
}

/**
 * Full Kata progress store schema.
 */
export interface KataProgressData {
  readonly version: number
  readonly userId: string // Anonymous UUID for future leaderboard support
  readonly completedKatas: readonly string[] // ["1", "2", ...]
  readonly currentKata: string | null // Currently active kata ID
  readonly kataStats: Record<string, KataStat> // Stats per kata ID
}

/**
 * Validation attempt tracking for current exercise.
 */
export interface ValidationAttempt {
  readonly exerciseId: string
  readonly timestamp: string // ISO timestamp
  readonly success: boolean
}

/**
 * Context value for Kata progress state.
 */
export interface KataProgressContextValue {
  /**
   * Full progress data from localStorage.
   */
  readonly data: KataProgressData

  /**
   * Anonymous user ID for future leaderboard support.
   */
  readonly userId: string

  /**
   * Array of completed Kata IDs (e.g., ["1", "2", ...]).
   */
  readonly completedKatas: readonly string[]

  /**
   * Currently active Kata ID, or null if none.
   */
  readonly currentKata: string | null

  /**
   * Statistics for completed Katas, keyed by kata ID.
   */
  readonly kataStats: Record<string, KataStat>

  /**
   * Check if a specific Kata is unlocked.
   * Kata 1 is always unlocked.
   * Kata N+1 is unlocked after completing Kata N.
   */
  readonly isKataUnlocked: (kataId: string) => boolean

  /**
   * Get the next unlocked Kata ID.
   * Returns "1" if no Katas started.
   * Returns null if all katas completed.
   */
  readonly getNextUnlockedKata: () => string | null

  /**
   * Start a Kata session.
   * Sets the currentKata and initializes attempt tracking.
   */
  readonly startKata: (kataId: string) => void

  /**
   * Record a validation attempt for the current exercise.
   * Increments attempt count for the current Kata.
   */
  readonly recordAttempt: (exerciseId: string, success: boolean) => void

  /**
   * Mark an exercise as completed within the current Kata.
   */
  readonly completeExercise: (kataId: string, exerciseId: string) => void

  /**
   * Mark a Kata as completed.
   * Adds to completedKatas, sets final stats, clears currentKata.
   */
  readonly completeKata: (kataId: string, finalAttempts: number) => void

  /**
   * Reset progress for a specific Kata.
   * Allows retrying a Kata from scratch.
   */
  readonly resetKata: (kataId: string) => void

  /**
   * Reset all Kata progress.
   * Clears all progress including completed Katas.
   */
  readonly resetAll: () => void
}

const KataProgressContext = createContext<KataProgressContextValue | null>(null)

/**
 * Props for KataProgressProvider.
 */
export interface KataProgressProviderProps {
  /**
   * React children to receive Kata progress context.
   */
  readonly children: ReactNode
}

/**
 * Generate a random UUID v4 for anonymous user tracking.
 * Uses crypto.randomUUID() when available, falls back to Math.random().
 */
function generateUserId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  // Fallback for older browsers
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Get or generate the anonymous user ID.
 */
function getUserId(): string {
  if (typeof window === "undefined") {
    return generateUserId()
  }

  try {
    const existing = localStorage.getItem(USER_ID_KEY)
    if (existing) {
      return existing
    }

    const newId = generateUserId()
    localStorage.setItem(USER_ID_KEY, newId)
    return newId
  } catch {
    // localStorage unavailable, generate ephemeral ID
    return generateUserId()
  }
}

/**
 * Parse and validate Kata progress data from localStorage.
 */
function parseKataProgressData(data: string | null, userId: string): KataProgressData {
  if (data === null) {
    return {
      version: SCHEMA_VERSION,
      userId,
      completedKatas: [],
      currentKata: null,
      kataStats: {},
    }
  }

  try {
    const parsed = JSON.parse(data) as unknown

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "version" in parsed &&
      "userId" in parsed &&
      "completedKatas" in parsed &&
      "currentKata" in parsed &&
      "kataStats" in parsed
    ) {
      // Validate completedKatas is an array of strings
      const completedKatas = parsed.completedKatas as unknown
      if (!Array.isArray(completedKatas)) {
        throw new Error("Invalid completedKatas")
      }

      // Validate kataStats is an object
      const kataStats = parsed.kataStats as unknown
      if (typeof kataStats !== "object" || kataStats === null) {
        throw new Error("Invalid kataStats")
      }

      return {
        version: typeof parsed.version === "number" ? parsed.version : SCHEMA_VERSION,
        userId: typeof parsed.userId === "string" ? parsed.userId : userId,
        completedKatas: completedKatas.filter((id): id is string => typeof id === "string"),
        currentKata:
          typeof parsed.currentKata === "string" && parsed.currentKata !== ""
            ? parsed.currentKata
            : null,
        kataStats: kataStats as Record<string, KataStat>,
      }
    }

    // Invalid schema, return empty
    return {
      version: SCHEMA_VERSION,
      userId,
      completedKatas: [],
      currentKata: null,
      kataStats: {},
    }
  } catch {
    // JSON parse error, return empty
    return {
      version: SCHEMA_VERSION,
      userId,
      completedKatas: [],
      currentKata: null,
      kataStats: {},
    }
  }
}

/**
 * Safely access localStorage with error handling.
 */
function getStorage(): Storage {
  if (typeof window === "undefined") {
    throw new Error("localStorage is not available")
  }

  const storage = window.localStorage
  // Test if localStorage is accessible (private mode, quota exceeded, etc.)
  try {
    const testKey = "__toolkata_kata_test__"
    storage.setItem(testKey, "test")
    storage.removeItem(testKey)
    return storage
  } catch {
    throw new Error("localStorage is not accessible")
  }
}

/**
 * KataProgressProvider - Provides Kata progress state to all children.
 *
 * Manages:
 * - Kata completion tracking (separate from tutorial progress)
 * - Attempt counting for accuracy metrics
 * - Anonymous user ID for future leaderboard support
 * - Progressive unlock state
 *
 * Must be rendered at layout level to persist across navigation.
 *
 * @example
 * ```tsx
 * import { KataProgressProvider } from "@/contexts/KataProgressContext"
 *
 * export function App({ children }) {
 *   return (
 *     <KataProgressProvider>
 *       {children}
 *     </KataProgressProvider>
 *   )
 * }
 * ```
 */
export function KataProgressProvider({ children }: KataProgressProviderProps) {
  // Get or generate user ID once on mount
  const [userId] = useState<string>(() => getUserId())

  // Load progress from localStorage on mount
  const [data, setData] = useState<KataProgressData>(() => {
    try {
      const storage = getStorage()
      const stored = storage.getItem(STORAGE_KEY)
      return parseKataProgressData(stored, userId)
    } catch {
      // localStorage unavailable, start with empty progress
      return {
        version: SCHEMA_VERSION,
        userId,
        completedKatas: [],
        currentKata: null,
        kataStats: {},
      }
    }
  })

  // Save data to localStorage whenever it changes
  useEffect(() => {
    try {
      const storage = getStorage()
      const serialized = JSON.stringify(data)
      storage.setItem(STORAGE_KEY, serialized)
    } catch {
      // Silently fail - user gets no progress tracking, but app still works
      // This is intentional graceful degradation
    }
  }, [data])

  // Listen for storage events from other tabs/windows
  // This keeps progress in sync when multiple tabs are open
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      // Only process changes to our storage key
      if (event.key !== STORAGE_KEY || event.newValue === null) {
        return
      }

      try {
        const newData = parseKataProgressData(event.newValue, userId)
        setData(newData)
      } catch {
        // If we can't parse the new data, keep current state
        // This prevents corrupt data from breaking the app
      }
    }

    // Add event listener for storage changes
    window.addEventListener("storage", handleStorageChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [userId])

  /**
   * Check if a specific Kata is unlocked.
   * Kata 1 is always unlocked.
   * Kata N+1 is unlocked after completing Kata N.
   */
  const isKataUnlocked = useCallback(
    (kataId: string): boolean => {
      const kataNum = Number.parseInt(kataId, 10)

      if (Number.isNaN(kataNum) || kataNum < 1) {
        return false
      }

      // Kata 1: always unlocked
      if (kataNum === 1) {
        return true
      }

      // Kata N+1: unlocked after completing Kata N
      const previousKataId = String(kataNum - 1)
      return data.completedKatas.includes(previousKataId)
    },
    [data.completedKatas],
  )

  /**
   * Get the next unlocked Kata ID.
   */
  const getNextUnlockedKata = useCallback((): string | null => {
    // Find first not-yet-completed Kata that is also unlocked
    for (let i = 1; i <= 7; i++) {
      const kataId = String(i)
      if (isKataUnlocked(kataId) && !data.completedKatas.includes(kataId)) {
        return kataId
      }
    }

    // All Katas completed
    return null
  }, [data.completedKatas, isKataUnlocked])

  /**
   * Start a Kata session.
   */
  const startKata = useCallback((kataId: string) => {
    setData((prev) => ({
      ...prev,
      currentKata: kataId,
    }))
  }, [])

  /**
   * Record a validation attempt for the current exercise.
   */
  const recordAttempt = useCallback((exerciseId: string, success: boolean) => {
    setData((prev) => {
      const currentKata = prev.currentKata
      if (!currentKata) {
        return prev
      }

      const existingStats = prev.kataStats[currentKata]
      const currentAttempts = existingStats?.attempts ?? 0
      const exerciseAttempts = existingStats?.exerciseAttempts ?? {}

      return {
        ...prev,
        kataStats: {
          ...prev.kataStats,
          [currentKata]: {
            completedAt: existingStats?.completedAt ?? new Date().toISOString(),
            attempts: success ? currentAttempts + 1 : currentAttempts,
            exercisesCompleted: existingStats?.exercisesCompleted ?? [],
            exerciseAttempts: {
              ...exerciseAttempts,
              [exerciseId]: (exerciseAttempts[exerciseId] ?? 0) + 1,
            },
          },
        },
      }
    })
  }, [])

  /**
   * Mark an exercise as completed within the current Kata.
   */
  const completeExercise = useCallback((kataId: string, exerciseId: string) => {
    setData((prev) => {
      const existingStats = prev.kataStats[kataId]
      const exercisesCompleted = existingStats?.exercisesCompleted ?? []

      // Avoid duplicates
      if (exercisesCompleted.includes(exerciseId)) {
        return prev
      }

      return {
        ...prev,
        kataStats: {
          ...prev.kataStats,
          [kataId]: {
            completedAt: existingStats?.completedAt ?? new Date().toISOString(),
            attempts: existingStats?.attempts ?? 0,
            exercisesCompleted: [...exercisesCompleted, exerciseId],
            exerciseAttempts: existingStats?.exerciseAttempts ?? {},
          },
        },
      }
    })
  }, [])

  /**
   * Mark a Kata as completed.
   */
  const completeKata = useCallback((kataId: string, finalAttempts: number) => {
    setData((prev) => {
      const completedKatas = prev.completedKatas.includes(kataId)
        ? prev.completedKatas
        : [...prev.completedKatas, kataId]

      const existingStats = prev.kataStats[kataId]

      return {
        ...prev,
        completedKatas,
        currentKata: null, // Clear current kata
        kataStats: {
          ...prev.kataStats,
          [kataId]: {
            completedAt: new Date().toISOString(),
            attempts: finalAttempts,
            exercisesCompleted: existingStats?.exercisesCompleted ?? [],
            exerciseAttempts: existingStats?.exerciseAttempts ?? {},
          },
        },
      }
    })
  }, [])

  /**
   * Reset progress for a specific Kata.
   */
  const resetKata = useCallback((kataId: string) => {
    setData((prev) => {
      const { [kataId]: _removed, ...remainingStats } = prev.kataStats
      const completedKatas = prev.completedKatas.filter((id) => id !== kataId)

      return {
        ...prev,
        completedKatas,
        currentKata: prev.currentKata === kataId ? null : prev.currentKata,
        kataStats: remainingStats,
      }
    })
  }, [])

  /**
   * Reset all Kata progress.
   */
  const resetAll = useCallback(() => {
    setData({
      version: SCHEMA_VERSION,
      userId,
      completedKatas: [],
      currentKata: null,
      kataStats: {},
    })
  }, [userId])

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<KataProgressContextValue>(
    () => ({
      data,
      userId,
      completedKatas: data.completedKatas,
      currentKata: data.currentKata,
      kataStats: data.kataStats,
      isKataUnlocked,
      getNextUnlockedKata,
      startKata,
      recordAttempt,
      completeExercise,
      completeKata,
      resetKata,
      resetAll,
    }),
    [
      data,
      userId,
      isKataUnlocked,
      getNextUnlockedKata,
      startKata,
      recordAttempt,
      completeExercise,
      completeKata,
      resetKata,
      resetAll,
    ],
  )

  return <KataProgressContext.Provider value={value}>{children}</KataProgressContext.Provider>
}

/**
 * useKataProgress - Access Kata progress state from context.
 *
 * Throws a helpful error if used outside KataProgressProvider.
 *
 * @returns KataProgressContextValue with progress state and methods
 * @throws Error if used outside KataProgressProvider
 *
 * @example
 * ```tsx
 * import { useKataProgress } from "@/contexts/KataProgressContext"
 *
 * export function MyComponent() {
 *   const { completedKatas, isKataUnlocked, completeKata } = useKataProgress()
 *
 *   return (
 *     <div>
 *       {completedKatas.length}/7 Katas completed
 *     </div>
 *   )
 * }
 * ```
 */
export function useKataProgress(): KataProgressContextValue {
  const context = useContext(KataProgressContext)

  if (!context) {
    throw new Error(
      "useKataProgress must be used within a KataProgressProvider. " +
        "Wrap your component tree with <KataProgressProvider>.",
    )
  }

  return context
}
