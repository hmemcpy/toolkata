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
 * Statistics for exercises within a kata.
 */
export interface KataStat {
  readonly completedAt: string // ISO timestamp
  readonly attempts: number // Validation attempts before success
  readonly exercisesCompleted: readonly string[] // ["1.1", "1.2", ...]
  readonly exerciseAttempts: Record<string, number> // Attempts per exercise ID
}

/**
 * Kata progress store schema.
 */
export interface KataProgressData {
  readonly version: number
  readonly userId: string
  readonly kataStats: Record<string, KataStat>
}

/**
 * Context value for kata exercise progress.
 */
export interface KataProgressContextValue {
  readonly data: KataProgressData
  readonly userId: string
  readonly kataStats: Record<string, KataStat>

  /** Record a validation attempt for an exercise. */
  readonly recordAttempt: (exerciseId: string, success: boolean) => void

  /** Mark an exercise as completed within a kata. */
  readonly completeExercise: (kataId: string, exerciseId: string) => void

  /** Reset progress for a specific kata. */
  readonly resetKata: (kataId: string) => void

  /** Reset all kata progress. */
  readonly resetAll: () => void
}

const KataProgressContext = createContext<KataProgressContextValue | null>(null)

export interface KataProgressProviderProps {
  readonly children: ReactNode
}

function generateUserId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

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
    return generateUserId()
  }
}

function parseKataProgressData(data: string | null, userId: string): KataProgressData {
  if (data === null) {
    return { version: SCHEMA_VERSION, userId, kataStats: {} }
  }

  try {
    const parsed = JSON.parse(data) as unknown

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "version" in parsed &&
      "userId" in parsed &&
      "kataStats" in parsed
    ) {
      const kataStats = parsed.kataStats as unknown
      if (typeof kataStats !== "object" || kataStats === null) {
        throw new Error("Invalid kataStats")
      }

      return {
        version: typeof parsed.version === "number" ? parsed.version : SCHEMA_VERSION,
        userId: typeof parsed.userId === "string" ? parsed.userId : userId,
        kataStats: kataStats as Record<string, KataStat>,
      }
    }

    return { version: SCHEMA_VERSION, userId, kataStats: {} }
  } catch {
    return { version: SCHEMA_VERSION, userId, kataStats: {} }
  }
}

function getStorage(): Storage {
  if (typeof window === "undefined") {
    throw new Error("localStorage is not available")
  }

  const storage = window.localStorage
  try {
    const testKey = "__toolkata_kata_test__"
    storage.setItem(testKey, "test")
    storage.removeItem(testKey)
    return storage
  } catch {
    throw new Error("localStorage is not accessible")
  }
}

export function KataProgressProvider({ children }: KataProgressProviderProps) {
  const [userId] = useState<string>(() => getUserId())

  const [data, setData] = useState<KataProgressData>(() => {
    try {
      const storage = getStorage()
      const stored = storage.getItem(STORAGE_KEY)
      return parseKataProgressData(stored, userId)
    } catch {
      return { version: SCHEMA_VERSION, userId, kataStats: {} }
    }
  })

  useEffect(() => {
    try {
      const storage = getStorage()
      storage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // Silently fail
    }
  }, [data])

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || event.newValue === null) {
        return
      }

      try {
        setData(parseKataProgressData(event.newValue, userId))
      } catch {
        // Keep current state
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [userId])

  const recordAttempt = useCallback((exerciseId: string, success: boolean) => {
    setData((prev) => {
      // Derive kataId from exercise ID (e.g., "1.1" → "1")
      const kataId = exerciseId.split(".")[0]
      if (!kataId) return prev

      const existingStats = prev.kataStats[kataId]
      const currentAttempts = existingStats?.attempts ?? 0
      const exerciseAttempts = existingStats?.exerciseAttempts ?? {}

      return {
        ...prev,
        kataStats: {
          ...prev.kataStats,
          [kataId]: {
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

  const completeExercise = useCallback((kataId: string, exerciseId: string) => {
    setData((prev) => {
      const existingStats = prev.kataStats[kataId]
      const exercisesCompleted = existingStats?.exercisesCompleted ?? []

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

  const resetKata = useCallback((kataId: string) => {
    setData((prev) => {
      const { [kataId]: _removed, ...remainingStats } = prev.kataStats
      return { ...prev, kataStats: remainingStats }
    })
  }, [])

  const resetAll = useCallback(() => {
    setData({ version: SCHEMA_VERSION, userId, kataStats: {} })
  }, [userId])

  const value = useMemo<KataProgressContextValue>(
    () => ({
      data,
      userId,
      kataStats: data.kataStats,
      recordAttempt,
      completeExercise,
      resetKata,
      resetAll,
    }),
    [data, userId, recordAttempt, completeExercise, resetKata, resetAll],
  )

  return <KataProgressContext.Provider value={value}>{children}</KataProgressContext.Provider>
}

/**
 * useKataProgress - Access kata exercise progress from context.
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
