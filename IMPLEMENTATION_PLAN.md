# Implementation Plan: Admin Dashboard

> **Scope**: Full stack | **Risk**: Balanced | **Validation**: All of the above | **Priority**: Rate limit admin

## Summary

Build a complete admin dashboard for toolkata with Effect-TS admin endpoints in sandbox-api (rate limits, containers, metrics) and a Next.js admin UI with Google OAuth. Protected by API key + IP allowlist via Caddy. Starting with rate limit management as the highest priority feature.

---

## Gap Analysis (Completed)

### Already Implemented (Foundation exists)

1. **RateLimitService** exists in `sandbox-api/src/services/rate-limit.ts`
   - Enforces rate limits using in-memory `Ref<MutableHashMap>`
   - Methods: `checkSessionLimit`, `recordSession`, `removeSession`, `checkCommandLimit`, `recordCommand`, `getActiveSessionCount`, `checkWebSocketLimit`, `registerWebSocket`, `unregisterWebSocket`
   - **NOT Redis** - Rate limits are stored in-memory (ephemeral, lost on restart)

2. **ContainerService** exists in `sandbox-api/src/services/container.ts`
   - Basic CRUD: `create`, `destroy`, `get`, `cleanupOrphaned`
   - Uses Dockerode via Docker socket
   - Lacks admin operations (list, restart, logs, stats)

3. **Effect-TS patterns** are well-established throughout
   - Service interfaces, Context.Tag, Layer.effect
   - Error handling with `Data.TaggedClass`
   - Proper dependency injection

4. **Hono routing** pattern exists in `sandbox-api/src/routes/`
   - File: `sessions.ts` shows the pattern for REST routes
   - API key validation via `validateApiKey` from `config.ts`
   - Error handling with `errorToResponse` helper

5. **AuditService** exists in `sandbox-api/src/services/audit.ts`
   - Structured logging for security events
   - Methods: `log`, `logAuthFailure`, `logRateLimitHit`, etc.

6. **SandboxClient** in web package provides pattern for Effect-TS service clients
   - File: `packages/web/services/sandbox-client.ts`
   - WebSocket + REST client pattern

7. **DockerClient** exists with proper Layer setup
   - File: `sandbox-api/src/services/container.ts` exports `DockerClientLive`
   - Can be reused for admin operations

### Missing (Needs to be built)

1. **No RateLimitAdminService** - Need to create for viewing/managing rate limits
   - Must read from the same in-memory store as `RateLimitService`
   - Methods: `getAllStatus`, `getStatus`, `resetLimit`, `adjustLimit`

2. **No admin routes** - No `/admin/*` endpoints exist
   - Need: `admin-rate-limits.ts`, `admin-containers.ts`, `admin-metrics.ts`
   - Registration in `src/index.ts`

3. **No NextAuth** - No authentication system in web package
   - `next-auth` is NOT in `packages/web/package.json` dependencies
   - Need: Google OAuth setup, admin email allowlist

4. **No admin UI** - No `/admin` pages or components
   - Need: Layout, rate limits page, containers page, metrics page

5. **No admin client** - No service to call admin API from web
   - Need: Effect-TS client with `X-Admin-Key` header

6. **No ContainerAdminService** - Need admin container operations
   - Methods: `listContainers`, `getContainer`, `restartContainer`, `stopContainer`, `removeContainer`, `streamLogs`, `execCommand`

7. **No MetricsService** - Need metrics collection
   - System metrics (CPU, memory, disk)
   - Sandbox metrics (active sessions, container count)
   - Rate limit metrics (violations, top clients)

8. **No middleware.ts** - Need Next.js middleware for admin route protection
   - Check session for admin flag
   - Redirect non-admins to home

### Key Discovery: In-Memory Storage (Not Redis)

The `admin-dashboard.md` spec assumes Redis for rate limit storage, but the actual implementation uses in-memory `Ref<MutableHashMap>`. This means:
- Rate limit data is **ephemeral** (lost on API restart)
- Admin service must access the same `RateLimitService` dependency
- No Redis connection needed for rate limit admin
- Simpler implementation but less durable

### Existing Type Patterns

From `rate-limit.ts`:
```typescript
export interface IpTracking {
  readonly sessionCount: number
  readonly hourWindowStart: number
  readonly activeSessions: readonly string[]
  readonly commandCount: number
  readonly minuteWindowStart: number
  readonly activeWebSocketIds: readonly string[]
}
```

From `container.ts`:
```typescript
export interface Container {
  readonly id: string
  readonly name: string
  readonly toolPair: string
  readonly createdAt: Date
}
```

---

## Tasks

### P0: Foundation (Infrastructure & Auth)

- [ ] **P0.1: Add admin route scaffolding to sandbox-api**
  - Create `src/routes/admin-rate-limits.ts` with stub handlers
  - Create `src/routes/admin-containers.ts` with stub handlers
  - Create `src/routes/admin-metrics.ts` with stub handlers
  - Register all admin routes in `src/index.ts` under `/admin/*` prefix
  - All routes should check for `ADMIN_API_KEY` env var at startup (fail fast if missing)
  - Follow existing Hono pattern from `sessions.ts`
  - Files: `packages/sandbox-api/src/routes/admin-*.ts`, `packages/sandbox-api/src/index.ts`

- [ ] **P0.2: Create RateLimitAdminService (Effect-TS)**
  - Define `RateLimitAdminService` interface with methods: `getAllStatus`, `getStatus`, `resetLimit`, `adjustLimit`
  - Implement using Effect.gen with proper error handling (`RateLimitAdminError` tagged class)
  - Access existing in-memory rate limit store - need to share the Ref from RateLimitService
  - Return `RateLimitStatus` objects with computed `remaining` and `resetAt`
  - **Important**: Must access the same `Ref<RateLimitStore>` that RateLimitService uses
  - File: `packages/sandbox-api/src/services/rate-limit-admin.ts`

- [ ] **P0.3: Implement GET /admin/rate-limits endpoint**
  - Use Hono router (existing pattern in sandbox-api)
  - Call `RateLimitAdminService.getAllStatus()`
  - Return JSON array of `RateLimitStatus`
  - Handle errors with proper HTTP status codes (500 for internal errors)
  - Validate `X-Admin-Key` header (or use Caddy validation)
  - File: `packages/sandbox-api/src/routes/admin-rate-limits.ts`

- [ ] **P0.4: Implement GET /admin/rate-limits/:clientId endpoint**
  - Extract clientId from path params
  - Call `RateLimitAdminService.getStatus(clientId)`
  - Return 404 if client not found, 200 with `RateLimitStatus` if found
  - File: `packages/sandbox-api/src/routes/admin-rate-limits.ts`

- [ ] **P0.5: Implement POST /admin/rate-limits/:clientId/reset endpoint**
  - Call `RateLimitAdminService.resetLimit(clientId)`
  - Clear the IP tracking entry from the in-memory store
  - Return 204 on success, 404 if client not found
  - File: `packages/sandbox-api/src/routes/admin-rate-limits.ts`

- [ ] **P0.6: Implement POST /admin/rate-limits/:clientId/adjust endpoint**
  - Parse body: `{ windowDuration?: number, maxRequests?: number }`
  - Validate inputs (positive integers)
  - Call `RateLimitAdminService.adjustLimit(clientId, params)`
  - Update the in-memory tracking with new values
  - Return 200 with updated `RateLimitStatus`
  - File: `packages/sandbox-api/src/routes/admin-rate-limits.ts`

- [ ] **P0.7: Install and set up NextAuth in web package**
  - Install `next-auth` (NOT currently in deps)
  - Create `packages/web/lib/auth.ts` with Google provider
  - Configure `ADMIN_EMAILS` env var check (comma-separated list)
  - Add session callback to set `isAdmin` flag
  - Add signIn callback to restrict to allowed emails
  - File: `packages/web/lib/auth.ts`

- [ ] **P0.8: Create admin layout with auth protection**
  - Create `packages/web/app/admin/layout.tsx`
  - Use `getServerSession` from NextAuth to check auth
  - Redirect to `/` if not authenticated or not admin
  - Include navigation sidebar: Dashboard, Rate Limits, Containers, Metrics
  - Apply terminal aesthetic (dark bg #0a0a0a, monospace, green accent #22c55e)
  - Follow existing layout pattern from `app/layout.tsx`
  - File: `packages/web/app/admin/layout.tsx`

- [ ] **P0.9: Create admin client service (Effect-TS)**
  - Create `packages/web/services/admin-client.ts`
  - Define `AdminClient` service with methods: `getRateLimits`, `getRateLimit`, `resetRateLimit`, `adjustRateLimit`
  - Use `fetch` wrapped in Effect.tryPromise
  - Add `X-Admin-Key` header from env var `ADMIN_API_KEY`
  - Handle HTTP errors with proper Effect error types
  - Follow existing pattern from `sandbox-client.ts`
  - File: `packages/web/services/admin-client.ts`

### P1: Rate Limit Admin UI

- [ ] **P1.1: Create /admin/rate-limits page**
  - Server component that fetches rate limits via `AdminClient`
  - Render `RateLimitTable` component with data
  - Handle empty state (no rate limits yet)
  - Add refresh button (revalidatePath)
  - File: `packages/web/app/admin/rate-limits/page.tsx`

- [ ] **P1.2: Create RateLimitTable component**
  - Props: `rateLimits: RateLimitStatus[]`, `onReset: (clientId) => void`, `onAdjust: (clientId, params) => void`
  - Table columns: Client ID, Sessions, Commands, WebSockets, Hour Window Start, Minute Window Start, Actions
  - Actions: Reset button (with confirmation), Adjust button (opens modal)
  - Sortable by any column
  - Search/filter by client ID
  - Terminal aesthetic styling (#0a0a0a bg, #22c55e accent)
  - File: `packages/web/components/admin/RateLimitTable.tsx`

- [ ] **P1.3: Create AdjustRateLimitModal component**
  - Props: `isOpen`, `onClose`, `onSubmit`, `initialValues`
  - Form fields: Window Duration (seconds), Max Requests (for display only - actual limits are global)
  - Note: Adjust is mostly for resetting counters since limits are global
  - Submit calls `onSubmit` with values
  - Cancel closes modal
  - File: `packages/web/components/admin/AdjustRateLimitModal.tsx`

- [ ] **P1.4: Add rate limit reset/adjust actions**
  - Wire up Reset button to call `AdminClient.resetRateLimit()`
  - Show confirmation dialog before reset
  - On success, refresh table data
  - Show toast/notification on success/error
  - File: `packages/web/app/admin/rate-limits/page.tsx` (update)

- [ ] **P1.5: Add loading and error states**
  - Skeleton loader for table while fetching
  - Error boundary for admin routes
  - Retry button on error
  - File: `packages/web/components/admin/RateLimitTable.tsx` (update)

### P2: Container Admin API

- [ ] **P2.1: Create ContainerAdminService (Effect-TS)**
  - Define interface: `listContainers`, `getContainer`, `restartContainer`, `stopContainer`, `removeContainer`, `streamLogs`, `execCommand`
  - Use Dockerode via existing `DockerClient` dependency
  - Implement `listContainers` with filters (status, label filters for toolkata.tool-pair)
  - Return `ContainerInfo` objects with stats (cpu, memory) if available from Docker inspect
  - Reuse `ContainerService` where possible for cleanup
  - File: `packages/sandbox-api/src/services/container-admin.ts`

- [ ] **P2.2: Implement GET /admin/containers endpoint**
  - Query params: `status`, `toolPair`, `olderThan` (for filtering old containers)
  - Call `ContainerAdminService.listContainers(filters)`
  - Return JSON array of `ContainerInfo`
  - File: `packages/sandbox-api/src/routes/admin-containers.ts`

- [ ] **P2.3: Implement GET /admin/containers/:id endpoint**
  - Call `ContainerAdminService.getContainer(id)`
  - Return detailed container info with stats
  - Return 404 if not found
  - File: `packages/sandbox-api/src/routes/admin-containers.ts`

- [ ] **P2.4: Implement POST /admin/containers/:id/restart endpoint**
  - Call `ContainerAdminService.restartContainer(id)`
  - Return 204 on success, 404 if not found, 409 if operation fails
  - File: `packages/sandbox-api/src/routes/admin-containers.ts`

- [ ] **P2.5: Implement POST /admin/containers/:id/stop endpoint**
  - Call `ContainerAdminService.stopContainer(id)`
  - Return 204 on success
  - File: `packages/sandbox-api/src/routes/admin-containers.ts`

- [ ] **P2.6: Implement DELETE /admin/containers/:id endpoint**
  - Query param: `force` (boolean)
  - Call `ContainerAdminService.removeContainer(id, force)`
  - Return 204 on success
  - File: `packages/sandbox-api/src/routes/admin-containers.ts`

- [ ] **P2.7: Implement GET /admin/containers/:id/logs endpoint**
  - Query param: `tail` (number of lines)
  - Call `ContainerAdminService.getLogs(id, tail)`
  - Return text/plain with log lines
  - File: `packages/sandbox-api/src/routes/admin-containers.ts`

### P3: Container Admin UI

- [ ] **P3.1: Create /admin/containers page**
  - Server component fetching containers via `AdminClient`
  - Filter controls: status dropdown, toolPair dropdown, "Show old only" checkbox
  - Render `ContainerGrid` component
  - File: `packages/web/app/admin/containers/page.tsx`

- [ ] **P3.2: Create ContainerGrid component**
  - Props: `containers: ContainerInfo[]`, action handlers
  - Card layout: ID (truncated), Name, Status (color-coded), Image, Created, CPU%, Memory
  - Actions per card: Restart, Stop, Remove (with confirmation), View Logs
  - Terminal aesthetic with status colors (running=green, stopped=red, dead=orange)
  - File: `packages/web/components/admin/ContainerGrid.tsx`

- [ ] **P3.3: Create LogViewer component**
  - Props: `containerId`, `isOpen`, `onClose`
  - Fetch logs via admin API
  - Scrollable log output with ANSI color support
  - Auto-refresh option for streaming logs
  - Download logs button
  - File: `packages/web/components/admin/LogViewer.tsx`

### P4: Metrics API

- [ ] **P4.1: Create MetricsService (Effect-TS)**
  - Interface: `getSystemMetrics`, `getSandboxMetrics`, `getRateLimitMetrics`
  - System metrics: use `os` module for CPU, memory, disk (via `df` command on Linux)
  - Sandbox metrics: query `SessionService` for active sessions, query Docker for container count
  - Rate limit metrics: query in-memory store for violations, top clients
  - Store time-series in memory (optional, can be single values for MVP)
  - File: `packages/sandbox-api/src/services/metrics.ts`

- [ ] **P4.2: Implement GET /admin/metrics/system endpoint**
  - Call `MetricsService.getSystemMetrics()`
  - Return `SystemMetrics` JSON with cpu, memory, disk, network
  - File: `packages/sandbox-api/src/routes/admin-metrics.ts`

- [ ] **P4.3: Implement GET /admin/metrics/sandbox endpoint**
  - Call `MetricsService.getSandboxMetrics()`
  - Return sandbox stats JSON: total sessions, running sessions, containers, errors
  - File: `packages/sandbox-api/src/routes/admin-metrics.ts`

- [ ] **P4.4: Implement GET /admin/metrics/rate-limits endpoint**
  - Call `MetricsService.getRateLimitMetrics()`
  - Return violations, blocked requests, top clients
  - File: `packages/sandbox-api/src/routes/admin-metrics.ts`

### P5: Metrics UI

- [ ] **P5.1: Create /admin/metrics page**
  - Three sections: System, Sandbox, Rate Limits
  - Auto-refresh every 30 seconds
  - Last updated timestamp
  - File: `packages/web/app/admin/metrics/page.tsx`

- [ ] **P5.2: Create MetricsPanel component**
  - Props: `title`, `metrics: Record<string, number | string>`
  - Grid layout of metric cards
  - Color coding for thresholds (e.g., red if CPU > 80%)
  - Terminal aesthetic styling
  - File: `packages/web/components/admin/MetricsPanel.tsx`

### P6: Testing & Validation

- [ ] **P6.1: Write unit tests for RateLimitAdminService**
  - Mock rate limit store
  - Test getAllStatus, getStatus, resetLimit, adjustLimit
  - Test error cases (client not found)
  - File: `packages/sandbox-api/tests/services/rate-limit-admin.test.ts`

- [ ] **P6.2: Write integration tests for admin endpoints**
  - Test all rate limit endpoints with real HTTP calls
  - Test auth (missing API key, invalid API key)
  - Test error cases (invalid client ID)
  - File: `packages/sandbox-api/tests/routes/admin.test.ts`

- [ ] **P6.3: Add Playwright tests for admin UI**
  - Test login flow (mock Google OAuth in test)
  - Test rate limits page loads and displays data
  - Test reset action (mock API response)
  - File: `packages/web/tests/admin.spec.ts`

- [ ] **P6.4: Manual testing checklist**
  - [ ] Rate limits page loads and shows data
  - [ ] Reset button works and refreshes data
  - [ ] Adjust modal opens and saves changes
  - [ ] Containers page lists containers
  - [ ] Container restart/stop/remove work
  - [ ] Logs viewer displays logs
  - [ ] Metrics page shows system/sandbox/rate-limit stats
  - [ ] Non-admin users cannot access /admin routes
  - [ ] Invalid API key returns 403

### P7: Deployment

- [ ] **P7.1: Add ADMIN_API_KEY to sandbox-api environment**
  - Add ADMIN_API_KEY to .env validation
  - Fail fast if not set in production
  - File: `packages/sandbox-api/src/config.ts`

- [ ] **P7.2: Add Vercel environment variables**
  - Document required env vars in README
  - Add to Vercel dashboard: ADMIN_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ADMIN_EMAILS
  - File: `README.md` (update)

- [ ] **P7.3: Update Caddy config for admin route protection**
  - Add IP allowlist for /admin/* routes
  - Verify X-Admin-Key header validation
  - Test API key validation
  - File: `scripts/hetzner/Caddyfile` (update)

---

## Dependencies

```
P0.1 (Route scaffolding) ──────────────────────┐
                                                │
P0.2 (RateLimitAdminService) ───────────────────┼──► P0.3-P0.6 (Rate limit endpoints)
       │                                        │         │
P0.7 (NextAuth) ────────────────────────────────┤         │
       │                                        │         ▼
P0.8 (Admin layout) ◄───────────────────────────┤    P1.1-P1.5 (Rate limit UI)
       │                                        │
P0.9 (Admin client) ◄───────────────────────────┘
       │
       ├──► P2.1-P2.7 (Container API) ──► P3.1-P3.3 (Container UI)
       │
       └──► P4.1-P4.4 (Metrics API) ────► P5.1-P5.2 (Metrics UI)
```

---

## File Structure (Final)

```
packages/sandbox-api/src/
├── services/
│   ├── rate-limit-admin.ts     # P0.2
│   ├── container-admin.ts      # P2.1
│   └── metrics.ts              # P4.1
├── routes/
│   ├── admin-rate-limits.ts    # P0.3-P0.6
│   ├── admin-containers.ts     # P2.2-P2.7
│   └── admin-metrics.ts        # P4.2-P4.4
└── config.ts                   # P7.1 - Add ADMIN_API_KEY validation

packages/web/
├── app/admin/
│   ├── layout.tsx              # P0.8
│   ├── page.tsx                # (dashboard home - optional)
│   ├── rate-limits/
│   │   └── page.tsx            # P1.1
│   ├── containers/
│   │   └── page.tsx            # P3.1
│   └── metrics/
│       └── page.tsx            # P5.1
├── components/admin/
│   ├── RateLimitTable.tsx      # P1.2
│   ├── AdjustRateLimitModal.tsx # P1.3
│   ├── ContainerGrid.tsx       # P3.2
│   ├── LogViewer.tsx           # P3.3
│   └── MetricsPanel.tsx        # P5.2
├── services/
│   └── admin-client.ts         # P0.9
├── lib/
│   └── auth.ts                 # P0.7
├── middleware.ts               # P0.8 - Add auth check
└── tests/
    └── admin.spec.ts           # P6.3
```

---

## Validation Command

```bash
# Type check and lint both packages
cd packages/sandbox-api && bun run typecheck && bun run lint
cd packages/web && bun run typecheck && bun run lint

# Run tests
cd packages/sandbox-api && bun test
cd packages/web && bun run test

# Build verification
cd packages/sandbox-api && bun run build
cd packages/web && bun run build
```

---

## Acceptance Criteria

- [ ] Admin UI accessible only to authorized Google accounts
- [ ] Rate limits page shows all clients with current usage
- [ ] Reset rate limit button clears client's rate limit
- [ ] Adjust rate limit changes window/max requests
- [ ] Containers page lists all sandbox containers
- [ ] Container restart/stop/remove actions work
- [ ] Logs viewer displays container logs
- [ ] Metrics page shows system, sandbox, and rate-limit stats
- [ ] All endpoints protected by API key + IP allowlist
- [ ] Unit tests pass for RateLimitAdminService
- [ ] Integration tests pass for admin endpoints
- [ ] Playwright tests pass for admin UI
- [ ] Manual testing checklist complete
