// User preferences types for localStorage

// Schema version for future migrations
const STORAGE_KEY = "toolkata_preferences"
const SCHEMA_VERSION = 1

/**
 * Direction preference for command comparisons
 */
export type DirectionPreference = "git-to-jj" | "jj-to-git"

/**
 * Full preferences store schema
 */
export interface PreferencesData {
  readonly version: number
  readonly direction: DirectionPreference
}

/**
 * Preferences store errors
 */
export class PreferencesError extends Error {
  readonly _tag = "PreferencesError"
  constructor(
    readonly cause: "Unavailable" | "InvalidData" | "WriteFailed",
    message: string,
  ) {
    super(message)
    this.name = "PreferencesError"
  }
}

/**
 * Default preferences
 */
const DEFAULT_PREFERENCES: PreferencesData = {
  version: SCHEMA_VERSION,
  direction: "git-to-jj",
}

/**
 * Parse and validate preferences data from localStorage
 */
function parsePreferencesData(data: string | null): PreferencesData {
  if (data === null) {
    return { ...DEFAULT_PREFERENCES }
  }

  try {
    const parsed = JSON.parse(data) as unknown

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "version" in parsed &&
      "direction" in parsed &&
      typeof parsed.version === "number" &&
      typeof parsed.direction === "string" &&
      (parsed.direction === "git-to-jj" || parsed.direction === "jj-to-git")
    ) {
      return {
        version: parsed.version,
        direction: parsed.direction,
      }
    }

    // Invalid schema, return defaults
    return { ...DEFAULT_PREFERENCES }
  } catch {
    // JSON parse error, return defaults
    return { ...DEFAULT_PREFERENCES }
  }
}

/**
 * Safely access localStorage with error handling
 */
function getStorage(): Storage {
  if (typeof window === "undefined") {
    throw new PreferencesError("Unavailable", "localStorage is not available")
  }

  const storage = window.localStorage
  // Test if localStorage is accessible (private mode, quota exceeded, etc.)
  try {
    const testKey = "__toolkata_test__"
    storage.setItem(testKey, "test")
    storage.removeItem(testKey)
    return storage
  } catch {
    throw new PreferencesError("Unavailable", "localStorage is not accessible")
  }
}

/**
 * PreferencesStore - Manages user preferences in localStorage
 *
 * Provides:
 * - Safe localStorage access with graceful degradation
 * - Schema versioning for future migrations
 * - Direction preference for bidirectional comparisons
 * - Error handling for quota exceeded, private mode, etc.
 */
export class PreferencesStore {
  private cache: PreferencesData | null = null
  private cacheDirty = false

  /**
   * Load preferences data from localStorage
   * Returns default preferences if unavailable or invalid
   */
  load(): PreferencesData {
    if (this.cache && !this.cacheDirty) {
      return this.cache
    }

    try {
      const storage = getStorage()
      const data = storage.getItem(STORAGE_KEY)
      this.cache = parsePreferencesData(data)
      this.cacheDirty = false
      return this.cache
    } catch (error) {
      if (error instanceof PreferencesError) {
        // localStorage unavailable, return defaults
        this.cache = { ...DEFAULT_PREFERENCES }
        this.cacheDirty = false
        return this.cache
      }
      throw error
    }
  }

  /**
   * Save preferences data to localStorage
   * Silently fails if unavailable (graceful degradation)
   */
  save(data: PreferencesData): void {
    try {
      const storage = getStorage()
      const serialized = JSON.stringify(data)
      storage.setItem(STORAGE_KEY, serialized)
      this.cache = data
      this.cacheDirty = false
    } catch (_error) {
      // Silently fail - user gets no preference persistence, but app still works
      // This is intentional graceful degradation
      this.cache = data
      this.cacheDirty = true
    }
  }

  /**
   * Get the current direction preference
   */
  getDirection(): DirectionPreference {
    const data = this.load()
    return data.direction
  }

  /**
   * Set the direction preference
   */
  setDirection(direction: DirectionPreference): void {
    const data = this.load()
    const newData = {
      ...data,
      direction,
    }
    this.save(newData)
  }

  /**
   * Toggle the direction preference
   */
  toggleDirection(): DirectionPreference {
    const current = this.getDirection()
    const newDirection = current === "git-to-jj" ? "jj-to-git" : "git-to-jj"
    this.setDirection(newDirection)
    return newDirection
  }

  /**
   * Check if the current direction is reversed (jj-to-git)
   */
  isReversed(): boolean {
    return this.getDirection() === "jj-to-git"
  }

  /**
   * Reset all preferences to defaults
   */
  resetAll(): void {
    this.save({ ...DEFAULT_PREFERENCES })
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
let storeInstance: PreferencesStore | null = null

/**
 * Get the singleton PreferencesStore instance
 */
export function getPreferencesStore(): PreferencesStore {
  if (!storeInstance) {
    storeInstance = new PreferencesStore()
  }
  return storeInstance
}
