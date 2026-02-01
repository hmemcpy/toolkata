// Preferences data types for localStorage

const STORAGE_KEY = "toolkata_preferences"
const SCHEMA_VERSION = 1

/**
 * Direction preference for tool comparisons
 * - "default": First tool on left (e.g., git→jj for jj-git pairing)
 * - "reversed": Second tool on left (e.g., jj→git for jj-git pairing)
 */
export type Direction = "default" | "reversed"

/**
 * Full preferences store schema
 */
export interface PreferencesData {
  readonly version: number
  readonly direction: Direction
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
 * Default preferences when none are stored or invalid
 */
function defaultPreferences(): PreferencesData {
  return { version: SCHEMA_VERSION, direction: "default" }
}

/**
 * Parse and validate preferences data from localStorage
 */
function parsePreferencesData(data: string | null): PreferencesData {
  if (data === null) {
    return defaultPreferences()
  }

  try {
    const parsed = JSON.parse(data) as unknown

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "version" in parsed &&
      "direction" in parsed &&
      typeof parsed.version === "number" &&
      (parsed.direction === "default" || parsed.direction === "reversed")
    ) {
      return {
        version: parsed.version,
        direction: parsed.direction,
      }
    }

    // Invalid schema, return defaults
    return defaultPreferences()
  } catch {
    // JSON parse error, return defaults
    return defaultPreferences()
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
    const testKey = "__toolkata_pref_test__"
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
 * - Direction preference for tool comparisons
 * - Error handling for quota exceeded, private mode, etc.
 */
export class PreferencesStore {
  private cache: PreferencesData | null = null
  private cacheDirty = false

  /**
   * Load preferences from localStorage
   * Returns defaults if unavailable or invalid
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
        this.cache = defaultPreferences()
        this.cacheDirty = false
        return this.cache
      }
      throw error
    }
  }

  /**
   * Save preferences to localStorage
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
      // Silently fail - user preferences won't persist, but app still works
      // This is intentional graceful degradation
      this.cache = data
      this.cacheDirty = true
    }
  }

  /**
   * Get current direction preference
   */
  getDirection(): Direction {
    return this.load().direction
  }

  /**
   * Set direction preference
   */
  setDirection(direction: Direction): void {
    const current = this.load()
    this.save({ ...current, direction })
  }

  /**
   * Check if direction is reversed
   */
  isReversed(): boolean {
    return this.getDirection() === "reversed"
  }

  /**
   * Toggle direction between default and reversed
   */
  toggleDirection(): Direction {
    const current = this.getDirection()
    const newDirection: Direction = current === "default" ? "reversed" : "default"
    this.setDirection(newDirection)
    return newDirection
  }

  /**
   * Reset preferences to defaults
   */
  reset(): void {
    this.save(defaultPreferences())
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
