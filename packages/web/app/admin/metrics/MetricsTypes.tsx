/**
 * System metrics from the admin API.
 */
export interface SystemMetricsInfo {
  readonly timestamp: number
  readonly cpu: {
    readonly percent: number
    readonly loadAvg: readonly number[]
    readonly cpuCount: number
  }
  readonly memory: {
    readonly used: number
    readonly total: number
    readonly percent: number
    readonly free: number
  }
  readonly disk: {
    readonly used: number
    readonly total: number
    readonly percent: number
    readonly free: number
  }
  readonly network: {
    readonly rxBytes: number
    readonly txBytes: number
  }
}

/**
 * Sandbox metrics from the admin API.
 */
export interface SandboxMetricsInfo {
  readonly timestamp: number
  readonly totalSessions: number
  readonly runningSessions: number
  readonly containers: number
  readonly errors: number
}

/**
 * Rate limit metrics from the admin API.
 */
export interface RateLimitMetricsInfo {
  readonly timestamp: number
  readonly totalClients: number
  readonly activeClients: number
  readonly violations: number
  readonly topClients: readonly {
    readonly clientId: string
    readonly sessionCount: number
    readonly commandCount: number
    readonly activeSessions: number
  }[]
}
