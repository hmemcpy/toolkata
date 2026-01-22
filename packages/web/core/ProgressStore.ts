// Progress data types for localStorage

// Schema version for future migrations
const STORAGE_KEY = "toolkata_progress"
const SCHEMA_VERSION = 1

/**
 * Progress data for a single tool pairing
 */
export interface ToolPairProgress {
  readonly completedSteps: readonly number[]
  readonly currentStep: number
  readonly lastVisited: string // ISO timestamp
}

/**
 * Full progress store schema
 */
export interface ProgressData {
  readonly version: number
  readonly pairings: Record<string, ToolPairProgress>
}

/**
 * Progress store errors
 */
export class ProgressError extends Error {
  readonly _tag = "ProgressError"
  constructor(
    readonly cause: "Unavailable" | "InvalidData" | "WriteFailed",
    message: string,
  ) {
    super(message)
    this.name = "ProgressError"
  }
}

/**
 * Parse and validate progress data from localStorage
 */
function parseProgressData(data: string | null): ProgressData {
  if (data === null) {
    return { version: SCHEMA_VERSION, pairings: {} }
  }

  try {
    const parsed = JSON.parse(data) as unknown

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "version" in parsed &&
      "pairings" in parsed &&
      typeof parsed.version === "number" &&
      typeof parsed.pairings === "object" &&
      parsed.pairings !== null
    ) {
      // Validate each pairing
      const pairings: Record<string, ToolPairProgress> = {}
      for (const [key, value] of Object.entries(parsed.pairings)) {
        const pairing = value as unknown
        if (
          typeof pairing === "object" &&
          pairing !== null &&
          "completedSteps" in pairing &&
          "currentStep" in pairing &&
          "lastVisited" in pairing &&
          Array.isArray(pairing.completedSteps) &&
          typeof pairing.currentStep === "number" &&
          typeof pairing.lastVisited === "string"
        ) {
          // Validate completedSteps are all numbers
          const completedSteps = pairing.completedSteps as unknown[]
          if (completedSteps.every((s) => typeof s === "number")) {
            pairings[key] = {
              completedSteps: completedSteps as number[],
              currentStep: pairing.currentStep,
              lastVisited: pairing.lastVisited,
            }
          }
        }
      }

      return { version: parsed.version, pairings }
    }

    // Invalid schema, return empty
    return { version: SCHEMA_VERSION, pairings: {} }
  } catch {
    // JSON parse error, return empty
    return { version: SCHEMA_VERSION, pairings: {} }
  }
}

/**
 * Safely access localStorage with error handling
 */
function getStorage(): Storage {
  if (typeof window === "undefined") {
    throw new ProgressError("Unavailable", "localStorage is not available")
  }

  const storage = window.localStorage
  // Test if localStorage is accessible (private mode, quota exceeded, etc.)
  try {
    const testKey = "__toolkata_test__"
    storage.setItem(testKey, "test")
    storage.removeItem(testKey)
    return storage
  } catch {
    throw new ProgressError("Unavailable", "localStorage is not accessible")
  }
}

/**
 * ProgressStore - Manages tutorial progress in localStorage
 *
 * Provides:
 * - Safe localStorage access with graceful degradation
 * - Schema versioning for future migrations
 * - Typed progress data per tool pairing
 * - Error handling for quota exceeded, private mode, etc.
 */
export class ProgressStore {
  private cache: ProgressData | null = null
  private cacheDirty = false

  /**
   * Load progress data from localStorage
   * Returns empty progress if unavailable or invalid
   */
  load(): ProgressData {
    if (this.cache && !this.cacheDirty) {
      return this.cache
    }

    try {
      const storage = getStorage()
      const data = storage.getItem(STORAGE_KEY)
      this.cache = parseProgressData(data)
      this.cacheDirty = false
      return this.cache
    } catch (error) {
      if (error instanceof ProgressError) {
        // localStorage unavailable, return empty progress
        this.cache = { version: SCHEMA_VERSION, pairings: {} }
        this.cacheDirty = false
        return this.cache
      }
      throw error
    }
  }

  /**
   * Save progress data to localStorage
   * Silently fails if unavailable (graceful degradation)
   */
  save(data: ProgressData): void {
    try {
      const storage = getStorage()
      const serialized = JSON.stringify(data)
      storage.setItem(STORAGE_KEY, serialized)
      this.cache = data
      this.cacheDirty = false
    } catch (_error) {
      // Silently fail - user gets no progress tracking, but app still works
      // This is intentional graceful degradation
      this.cache = data
      this.cacheDirty = true
    }
  }

  /**
   * Get progress for a specific tool pairing
   */
  getProgress(toolPair: string): ToolPairProgress | undefined {
    const data = this.load()
    return data.pairings[toolPair]
  }

  /**
   * Set progress for a specific tool pairing
   */
  setProgress(toolPair: string, progress: ToolPairProgress): void {
    const data = this.load()
    const newData = {
      ...data,
      pairings: { ...data.pairings, [toolPair]: progress },
    }
    this.save(newData)
  }

  /**
   * Mark a step as completed for a tool pairing
   */
  markComplete(toolPair: string, step: number): void {
    const current = this.getProgress(toolPair)
    const completedSteps = current?.completedSteps ?? []

    // Avoid duplicates
    if (!completedSteps.includes(step)) {
      const newCompletedSteps = [...completedSteps, step].sort((a, b) => a - b)
      this.setProgress(toolPair, {
        completedSteps: newCompletedSteps,
        currentStep: step + 1,
        lastVisited: new Date().toISOString(),
      })
    }
  }

  /**
   * Set the current step (without marking complete)
   */
  setCurrentStep(toolPair: string, step: number): void {
    const current = this.getProgress(toolPair)
    this.setProgress(toolPair, {
      completedSteps: current?.completedSteps ?? [],
      currentStep: step,
      lastVisited: new Date().toISOString(),
    })
  }

  /**
   * Reset all progress for a tool pairing
   */
  resetProgress(toolPair: string): void {
    const data = this.load()
    const { [toolPair]: _removed, ...remainingPairings } = data.pairings
    this.save({ ...data, pairings: remainingPairings })
  }

  /**
   * Reset all progress (all pairings)
   */
  resetAll(): void {
    this.save({ version: SCHEMA_VERSION, pairings: {} })
  }

  /**
   * Check if localStorage is available
   */
  isAvailable(): boolean {
    try {
      getStorage()
      return true
    } catch {
      return false
    }
  }
}

// Singleton instance
let storeInstance: ProgressStore | null = null

/**
 * Get the singleton ProgressStore instance
 */
export function getProgressStore(): ProgressStore {
  if (!storeInstance) {
    storeInstance = new ProgressStore()
  }
  return storeInstance
}
