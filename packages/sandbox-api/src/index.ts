// Placeholder entry point for sandbox-api
// Phase 1.3: Initialize with Effect-TS (not yet implemented)

export const healthCheck = () => ({
  status: "ok" as const,
  timestamp: new Date().toISOString(),
})
