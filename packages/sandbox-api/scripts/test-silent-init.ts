#!/usr/bin/env bun
/**
 * Test script to verify silent init commands work correctly.
 *
 * This script:
 * 1. Creates a session via REST API
 * 2. Connects via WebSocket
 * 3. Sends init commands with silent: true
 * 4. Verifies no output leaks before initComplete
 * 5. Verifies initComplete message is received with success: true
 * 6. Cleans up the session
 *
 * Usage:
 *   bun run scripts/test-silent-init.ts
 *
 * Requires sandbox-api to be running on localhost:3001
 */

const SANDBOX_URL = process.env.SANDBOX_API_URL ?? "http://localhost:3001"
const API_KEY = process.env.SANDBOX_API_KEY ?? "dev-test-key"

interface Session {
  sessionId: string
  wsUrl: string
}

interface InitCompleteMessage {
  type: "initComplete"
  success: boolean
  error?: string
}

// Create a session
async function createSession(): Promise<Session> {
  const response = await fetch(`${SANDBOX_URL}/api/v1/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
    },
    body: JSON.stringify({
      toolPair: "jj-git",
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to create session: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as { sessionId: string; wsUrl: string }
  return {
    sessionId: data.sessionId,
    wsUrl: data.wsUrl,
  }
}

// Delete a session
async function deleteSession(sessionId: string): Promise<void> {
  const response = await fetch(`${SANDBOX_URL}/api/v1/sessions/${sessionId}`, {
    method: "DELETE",
    headers: {
      "X-API-Key": API_KEY,
    },
  })

  if (!response.ok) {
    console.error(`Failed to delete session: ${response.status} ${response.statusText}`)
  }
}

// Test silent init commands
async function testSilentInit(): Promise<boolean> {
  console.log("=== Testing Silent Init Commands ===\n")

  // Create session
  console.log("1. Creating session...")
  const session = await createSession()
  console.log(`   Session ID: ${session.sessionId}`)
  console.log(`   WebSocket URL: ${session.wsUrl}`)

  // Build WebSocket URL with API key
  const wsUrl = new URL(session.wsUrl)
  wsUrl.searchParams.set("api_key", API_KEY)

  // Track received messages
  const receivedMessages: string[] = []
  let initCompleteReceived = false
  let initCompleteSuccess = false

  // Connect via WebSocket
  console.log("\n2. Connecting via WebSocket...")
  const ws = new WebSocket(wsUrl.toString())

  await new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => {
      console.error("   ERROR: Test timed out waiting for initComplete")
      ws.close()
      resolve(false)
    }, 30000)

    ws.onopen = () => {
      console.log("   Connected!")

      // Wait a moment for the connection to stabilize
      setTimeout(() => {
        // Send silent init commands
        console.log("\n3. Sending silent init commands...")
        const initMessage = {
          type: "init",
          commands: ["echo 'INIT_COMMAND_OUTPUT_123'", "pwd"],
          silent: true,
          timeout: 10000,
        }
        console.log(`   Message: ${JSON.stringify(initMessage)}`)
        ws.send(JSON.stringify(initMessage))
      }, 500)
    }

    ws.onmessage = (event) => {
      const raw = event.data.toString()
      receivedMessages.push(raw)

      // Try to parse as JSON
      try {
        const message = JSON.parse(raw) as Record<string, unknown>

        if (message.type === "connected") {
          console.log(`   Received: connected (sessionId: ${message.sessionId})`)
          return
        }

        if (message.type === "output") {
          console.log("   Received: output banner")
          return
        }

        if (message.type === "initComplete") {
          initCompleteReceived = true
          initCompleteSuccess = (message as InitCompleteMessage).success
          console.log("\n4. Received initComplete:")
          console.log(`   success: ${initCompleteSuccess}`)
          if ((message as InitCompleteMessage).error) {
            console.log(`   error: ${(message as InitCompleteMessage).error}`)
          }

          clearTimeout(timeout)

          // Give a moment for any delayed output to arrive
          setTimeout(() => {
            ws.close()
            resolve(true)
          }, 500)
          return
        }
      } catch {
        // Not JSON - this is raw terminal output
        if (!initCompleteReceived) {
          // Check if it contains our marker
          if (raw.includes("INIT_COMMAND_OUTPUT_123")) {
            console.error(`   ERROR: Init command output leaked! Received: ${raw.slice(0, 100)}...`)
          } else {
            // Some output might be acceptable (prompt, etc.) but our marker should not leak
            console.log(
              `   Terminal output (pre-init): ${raw.slice(0, 50).replace(/\n/g, "\\n")}...`,
            )
          }
        }
      }
    }

    ws.onerror = (error) => {
      console.error("   WebSocket error:", error)
      clearTimeout(timeout)
      resolve(false)
    }

    ws.onclose = () => {
      console.log("\n   WebSocket closed")
    }
  })

  // Cleanup
  console.log("\n5. Cleaning up session...")
  await deleteSession(session.sessionId)
  console.log("   Session deleted")

  // Report results
  console.log("\n=== Test Results ===")

  // Check if our marker output leaked
  const markerLeaked = receivedMessages.some((msg) => msg.includes("INIT_COMMAND_OUTPUT_123"))

  if (!initCompleteReceived) {
    console.log("FAIL: initComplete was not received")
    return false
  }

  if (!initCompleteSuccess) {
    console.log("FAIL: initComplete.success was false")
    return false
  }

  if (markerLeaked) {
    console.log("FAIL: Init command output leaked (marker found in received messages)")
    return false
  }

  console.log("PASS: Silent init commands working correctly!")
  console.log("  - initComplete received: true")
  console.log("  - initComplete.success: true")
  console.log("  - Init command output leaked: false")

  return true
}

// Test non-silent init commands (output SHOULD be visible)
async function testNonSilentInit(): Promise<boolean> {
  console.log("\n\n=== Testing Non-Silent Init Commands ===\n")

  // Create session
  console.log("1. Creating session...")
  const session = await createSession()
  console.log(`   Session ID: ${session.sessionId}`)

  // Build WebSocket URL with API key
  const wsUrl = new URL(session.wsUrl)
  wsUrl.searchParams.set("api_key", API_KEY)

  // Track received messages
  let initCompleteReceived = false
  let initCompleteSuccess = false
  let markerOutputReceived = false

  // Connect via WebSocket
  console.log("\n2. Connecting via WebSocket...")
  const ws = new WebSocket(wsUrl.toString())

  await new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => {
      console.error("   ERROR: Test timed out")
      ws.close()
      resolve(false)
    }, 30000)

    ws.onopen = () => {
      console.log("   Connected!")

      // Wait a moment for the connection to stabilize
      setTimeout(() => {
        // Send NON-silent init commands
        console.log("\n3. Sending non-silent init commands...")
        const initMessage = {
          type: "init",
          commands: ["echo 'NONSILENT_MARKER_456'"],
          silent: false, // Explicit false
          timeout: 10000,
        }
        console.log(`   Message: ${JSON.stringify(initMessage)}`)
        ws.send(JSON.stringify(initMessage))
      }, 500)
    }

    ws.onmessage = (event) => {
      const raw = event.data.toString()

      // Try to parse as JSON
      try {
        const message = JSON.parse(raw) as Record<string, unknown>

        if (message.type === "connected" || message.type === "output") {
          return
        }

        if (message.type === "initComplete") {
          initCompleteReceived = true
          initCompleteSuccess = (message as InitCompleteMessage).success
          console.log(`\n4. Received initComplete: success=${initCompleteSuccess}`)

          clearTimeout(timeout)
          setTimeout(() => {
            ws.close()
            resolve(true)
          }, 500)
          return
        }
      } catch {
        // Not JSON - terminal output
        if (raw.includes("NONSILENT_MARKER_456")) {
          markerOutputReceived = true
          console.log("   Received marker output (expected for non-silent)")
        }
      }
    }

    ws.onerror = (error) => {
      console.error("   WebSocket error:", error)
      clearTimeout(timeout)
      resolve(false)
    }

    ws.onclose = () => {
      console.log("\n   WebSocket closed")
    }
  })

  // Cleanup
  console.log("\n5. Cleaning up session...")
  await deleteSession(session.sessionId)
  console.log("   Session deleted")

  // Report results
  console.log("\n=== Test Results ===")

  if (!initCompleteReceived) {
    console.log("FAIL: initComplete was not received")
    return false
  }

  if (!initCompleteSuccess) {
    console.log("FAIL: initComplete.success was false")
    return false
  }

  if (!markerOutputReceived) {
    console.log("FAIL: Output was not received (should be visible when silent=false)")
    return false
  }

  console.log("PASS: Non-silent init commands working correctly!")
  console.log("  - initComplete received: true")
  console.log("  - initComplete.success: true")
  console.log("  - Output visible: true")

  return true
}

// Main
async function main() {
  console.log("Testing silent init commands for snippet validation system")
  console.log(`Sandbox API URL: ${SANDBOX_URL}`)
  console.log(`Using API key: ${API_KEY.slice(0, 4)}...${API_KEY.slice(-4)}\n`)

  // Health check
  console.log("Checking sandbox-api health...")
  try {
    const health = await fetch(`${SANDBOX_URL}/api/v1/status`)
    if (!health.ok) {
      console.error("ERROR: sandbox-api is not healthy")
      console.error("Start it with: bun run --cwd packages/sandbox-api dev")
      process.exit(1)
    }
    console.log("sandbox-api is healthy\n")
  } catch {
    console.error("ERROR: Cannot connect to sandbox-api")
    console.error("Start it with: bun run --cwd packages/sandbox-api dev")
    process.exit(1)
  }

  // Run tests
  const silentResult = await testSilentInit()
  const nonSilentResult = await testNonSilentInit()

  // Final summary
  console.log("\n\n========== FINAL SUMMARY ==========")
  console.log(`Silent init test:     ${silentResult ? "PASS" : "FAIL"}`)
  console.log(`Non-silent init test: ${nonSilentResult ? "PASS" : "FAIL"}`)

  if (silentResult && nonSilentResult) {
    console.log("\nAll tests passed!")
    process.exit(0)
  } else {
    console.log("\nSome tests failed!")
    process.exit(1)
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error)
  process.exit(1)
})
