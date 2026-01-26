/**
 * Sandbox Manager - Auto-start/stop sandbox-api for snippet validation
 *
 * This module provides utilities to:
 * 1. Check if sandbox-api is already running via health check
 * 2. Spawn sandbox-api as a child process if not running
 * 3. Wait for it to become healthy (with timeout)
 * 4. Clean up the child process on exit
 */

import type { Subprocess } from "bun"

const DEFAULT_SANDBOX_URL = "http://localhost:3001"
const HEALTH_TIMEOUT_MS = 30_000
const HEALTH_POLL_INTERVAL_MS = 500

/**
 * Check if sandbox-api is running by hitting the health endpoint
 */
export async function healthCheck(baseUrl: string = DEFAULT_SANDBOX_URL): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/health`, {
      signal: AbortSignal.timeout(2000),
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Wait for sandbox-api to become healthy, polling at regular intervals
 */
async function waitForHealthy(
  baseUrl: string,
  timeoutMs: number = HEALTH_TIMEOUT_MS,
): Promise<void> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    const isHealthy = await healthCheck(baseUrl)
    if (isHealthy) {
      return
    }
    await Bun.sleep(HEALTH_POLL_INTERVAL_MS)
  }

  throw new Error(`sandbox-api failed to become healthy within ${timeoutMs}ms`)
}

export interface SandboxManager {
  readonly cleanup: () => Promise<void>
  readonly url: string
  readonly wasStarted: boolean
}

/**
 * Ensure sandbox-api is running, starting it if necessary
 *
 * Returns a cleanup function that should be called when done
 */
export async function ensureSandboxRunning(): Promise<SandboxManager> {
  const sandboxUrl = process.env["SANDBOX_API_URL"] ?? DEFAULT_SANDBOX_URL

  // Check if already running
  const isRunning = await healthCheck(sandboxUrl)
  if (isRunning) {
    console.log("sandbox-api already running at", sandboxUrl)
    return {
      cleanup: async () => {},
      url: sandboxUrl,
      wasStarted: false,
    }
  }

  // Need to start sandbox-api
  console.log("Starting sandbox-api...")

  // Determine the sandbox-api directory relative to packages/web/scripts
  const sandboxApiDir = new URL("../../sandbox-api", import.meta.url).pathname

  const proc: Subprocess = Bun.spawn(["bun", "run", "dev"], {
    cwd: sandboxApiDir,
    stdout: "inherit",
    stderr: "inherit",
    env: {
      ...process.env,
      // Ensure the sandbox-api uses the same port we're checking
      PORT: new URL(sandboxUrl).port,
    },
  })

  // Wait for health check to pass
  try {
    await waitForHealthy(sandboxUrl)
    console.log("sandbox-api ready at", sandboxUrl)
  } catch (error) {
    // Clean up if startup failed
    proc.kill()
    await proc.exited
    throw error
  }

  return {
    cleanup: async () => {
      console.log("Stopping sandbox-api...")
      proc.kill()
      await proc.exited
      console.log("sandbox-api stopped")
    },
    url: sandboxUrl,
    wasStarted: true,
  }
}

// Allow running directly for testing
if (import.meta.main) {
  console.log("Testing sandbox manager...")

  const manager = await ensureSandboxRunning()
  console.log("Sandbox running:", manager.url)
  console.log("Was started by us:", manager.wasStarted)

  // Wait a bit then cleanup
  console.log("Press Ctrl+C to stop or waiting 5 seconds...")
  await Bun.sleep(5000)

  await manager.cleanup()
  console.log("Done")
}
