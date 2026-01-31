# Admin Dashboard Specification

## Overview

A comprehensive admin system for managing toolkata sandboxes, rate limits, and monitoring. Built as a full-stack feature: Effect-TS admin endpoints in sandbox-api (port 3001) with IP + API key protection, and a Next.js admin UI on Vercel with Google OAuth authentication.

---

## Requirements

### R1: Authentication & Authorization

**R1.1** Admin UI uses NextAuth with Google OAuth, restricted to configured email addresses
**R1.2** Vercel → Hetzner requests use API key + IP allowlist (Vercel egress IPs)
**R1.3** Caddy validates `X-Admin-Key` header and source IP for all `/admin/*` routes
**R1.4** Admin endpoints return 403 for invalid credentials or unauthorized IPs

### R2: Rate Limit Admin API

**R2.1** `GET /admin/rate-limits` returns current rate limit status for all clients
**R2.2** `GET /admin/rate-limits/:clientId` returns specific client rate limit status
**R2.3** `POST /admin/rate-limits/:clientId/reset` resets rate limit for a client
**R2.4** `POST /admin/rate-limits/:clientId/adjust` adjusts rate limit parameters (window, max requests)
**R2.5** Rate limit data includes: client ID, current count, window start, max allowed, remaining

### R3: Container Admin API

**R3.1** `GET /admin/containers` lists all sandbox containers with filters (status, age, toolPair)
**R3.2** `GET /admin/containers/:id` returns detailed container info (stats, logs preview)
**R3.3** `POST /admin/containers/:id/restart` restarts a container
**R3.4** `POST /admin/containers/:id/stop` stops a container
**R3.5** `POST /admin/containers/:id/remove` removes a container (with force option)
**R3.6** `GET /admin/containers/:id/logs` streams container logs (WebSocket or SSE)
**R3.7** `POST /admin/containers/:id/exec` executes a command in container (diagnostics)

### R4: Metrics API

**R4.1** `GET /admin/metrics/system` returns CPU, memory, disk, network stats
**R4.2** `GET /admin/metrics/sandbox` returns active sessions, containers created, error rate
**R4.3** `GET /admin/metrics/rate-limits` returns violations, blocked requests, top clients
**R4.4** Metrics include time-series data (last 1h, 24h, 7d where applicable)

### R5: Admin UI

**R5.1** `/admin` route is protected by NextAuth middleware
**R5.2** Non-admin users are redirected to home page
**R5.3** Admin layout includes navigation sidebar with: Dashboard, Rate Limits, Containers, Metrics
**R5.4** Rate Limits page shows: client list, current usage, reset/adjust actions
**R5.5** Containers page shows: container grid, status, actions (restart, stop, remove), log viewer
**R5.6** Metrics page shows: system stats, sandbox stats, rate limit trends
**R5.7** All admin pages use terminal aesthetic (dark theme, monospace, green accent)

### R6: Data Storage

**R6.1** Rate limit data stored in Redis (existing)
**R6.2** Metrics stored in Redis time-series format
**R6.3** Container data queried live from Docker socket

### R7: Security

**R7.1** Admin API never exposes sensitive data (env vars, user code content)
**R7.2** Container exec restricted to read-only diagnostic commands
**R7.3** All admin actions are logged (who, what, when)
**R7.4** Rate limit on admin endpoints themselves (prevent abuse)

---

## Constraints

- **C1**: Admin endpoints run in sandbox-api (port 3001), not a separate service
- **C2**: Caddy handles IP allowlist and API key validation (not application code)
- **C3**: Redis already provisioned on Hetzner (reuse existing connection)
- **C4**: Docker socket access via Dockerode (existing dependency)
- **C5**: Effect-TS for all server-side code, React/Next.js for UI
- **C6**: Terminal aesthetic must be maintained (dark #0a0a0a, green #22c55e)

---

## Edge Cases

- **E1**: Redis unavailable → return 503 with retry-after header
- **E2**: Docker socket permission denied → log error, return 500
- **E3**: Invalid client ID in rate limit API → return 404
- **E4**: Container not found → return 404
- **E5**: Container operation fails (e.g., already stopped) → return 409 with details
- **E6**: Admin API key not configured → fail startup with clear error
- **E7**: Vercel egress IP changes → admin requests blocked (manual Caddy update needed)

---

## Out of Scope

- Content CMS (Git-based editing) — deferred to Phase 4
- Alerting system with Slack/email — deferred to Phase 5
- Real-time metrics graphs (start with data tables)
- Multi-user editing/locking
- Automatic container restart on failure (manual only)
- mTLS for Vercel→Hetzner (using API key + IP for simplicity)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Vercel (Frontend)                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  Admin Dashboard                                                        │ │
│  │  ├─ /admin              → Dashboard home                                │ │
│  │  ├─ /admin/rate-limits → Rate limit management                        │ │
│  │  ├─ /admin/containers  → Container management                         │ │
│  │  └─ /admin/metrics     → System/sandbox metrics                       │ │
│  │                                                                         │ │
│  │  Auth: NextAuth + Google OAuth (restricted emails)                    │ │
│  │  API Client: Effect-TS with X-Admin-Key header                        │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTPS + X-Admin-Key
                                      │ (Vercel egress IPs only via Caddy)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Hetzner VPS (Sandbox + Admin)                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  Caddy (Reverse Proxy)                                                  │ │
│  │  ├─ /health, /sandbox/* → Public routes                                │ │
│  │  └─ /admin/*           → IP allowlist + API key check → localhost:3001 │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  Sandbox API (port 3001)                                                │ │
│  │  ├─ Public routes: /health, /sandbox/*                                  │ │
│  │  └─ Admin routes: /admin/* (protected by Caddy)                         │ │
│  │      ├─ /admin/rate-limits      → RateLimitService                     │ │
│  │      ├─ /admin/containers       → ContainerAdminService                │ │
│  │      └─ /admin/metrics          → MetricsService                       │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                       │
│  ┌─────────────────┐  ┌─────────────────────────┐                            │
│  │  Redis          │  │  Docker Socket          │                            │
│  │  - Rate limits  │  │  - Container mgmt       │                            │
│  │  - Metrics      │  │  - Log streaming        │                            │
│  └─────────────────┘  └─────────────────────────┘                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Models

### RateLimitStatus
```typescript
interface RateLimitStatus {
  clientId: string
  windowStart: number      // Unix timestamp
  windowDuration: number   // seconds
  maxRequests: number
  currentCount: number
  remaining: number
  resetAt: number          // Unix timestamp
  violations: number       // total violations for this client
}
```

### ContainerInfo
```typescript
interface ContainerInfo {
  id: string
  name: string
  status: "running" | "stopped" | "exited" | "dead"
  image: string
  createdAt: number
  startedAt?: number
  toolPair?: string
  sessionId?: string
  cpuPercent?: number
  memoryUsage?: number
  memoryLimit?: number
}
```

### SystemMetrics
```typescript
interface SystemMetrics {
  timestamp: number
  cpu: {
    percent: number
    loadAvg: [number, number, number]
  }
  memory: {
    used: number
    total: number
    percent: number
  }
  disk: {
    used: number
    total: number
    percent: number
  }
  network: {
    rxBytes: number
    txBytes: number
  }
}
```

---

## Files to Create/Modify

### New Files (Sandbox API)
```
packages/sandbox-api/src/
├── services/
│   ├── rate-limit-admin.ts     # Rate limit query/reset/adjust
│   ├── container-admin.ts      # Container management
│   └── metrics.ts              # System/sandbox metrics
├── routes/
│   ├── admin-rate-limits.ts    # /admin/rate-limits endpoints
│   ├── admin-containers.ts     # /admin/containers endpoints
│   └── admin-metrics.ts        # /admin/metrics endpoints
└── lib/
    └── docker-admin.ts         # Dockerode wrapper for admin ops
```

### New Files (Web)
```
packages/web/
├── app/admin/
│   ├── layout.tsx              # Admin layout with auth
│   ├── page.tsx                # Dashboard home
│   ├── rate-limits/
│   │   └── page.tsx            # Rate limit management
│   ├── containers/
│   │   └── page.tsx            # Container management
│   └── metrics/
│       └── page.tsx            # Metrics dashboard
├── components/admin/
│   ├── AdminLayout.tsx         # Sidebar + header
│   ├── RateLimitTable.tsx      # Client list with actions
│   ├── ContainerGrid.tsx       # Container cards
│   ├── LogViewer.tsx           # Log streaming display
│   └── MetricsPanel.tsx        # Stats display
├── services/
│   └── admin-client.ts         # Effect-TS client for admin API
└── lib/
    └── auth.ts                 # NextAuth config
```

### Modified Files
```
packages/sandbox-api/
├── src/main.ts                 # Register admin routes
└── deploy/sandbox-api.service  # Add ADMIN_API_KEY env

packages/web/
├── middleware.ts               # Add admin auth check
└── .env.local                  # Add ADMIN_API_KEY, GOOGLE_* vars
```

---

## Environment Variables

### Vercel (packages/web/.env.local)
```bash
# NextAuth
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
ADMIN_EMAILS=admin@toolkata.com

# Admin API Client
ADMIN_API_KEY=secure-random-key
ADMIN_API_URL=https://sandbox.toolkata.com
```

### Hetzner (sandbox-api .env)
```bash
ADMIN_API_KEY=secure-random-key  # Must match Vercel
```

---

## Validation Command

```bash
cd packages/web && bun run build && bun run typecheck && bun run lint && bun run test
cd packages/sandbox-api && bun run build && bun run typecheck && bun run lint
```
