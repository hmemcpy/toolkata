# Plan: toolkata - Developer Tool Comparison Website

## Overview

**toolkata** - A minimal, surgical website teaching developers how to use tool X if they already know tool Y. Initial focus: **jj (Jujutsu) for Git users**.

- **Progress**: localStorage-based (anonymous, no accounts)
- **Cheat sheets**: Yes, one per tool comparison
- **Interactivity**: Interactive sandboxed terminals (self-hosted on Hetzner/OVH VPS)

---

## UX Design

### Design Philosophy

**"Surgical precision, zero noise"**

- Monospace-first typography (JetBrains Mono / Fira Code)
- High contrast, minimal color palette
- No animations except functional transitions
- Dense information display
- Terminal-aesthetic inspiration

### Color System

```
Background:     #0a0a0a (near-black)
Surface:        #141414 (card backgrounds)
Border:         #262626 (subtle dividers)
Text Primary:   #fafafa (white)
Text Secondary: #a1a1a1 (muted)
Accent:         #22c55e (green - success/jj)
Accent Alt:     #f97316 (orange - git)
Code BG:        #1a1a1a
```

### Typography

```
Headings:       JetBrains Mono, 700
Body:           JetBrains Mono, 400
Code:           JetBrains Mono, 400
Size Scale:     12px, 14px, 16px, 20px, 24px, 32px
Line Height:    1.6 for body, 1.3 for headings
```

### Layout Structure

#### Home Page
```
┌─────────────────────────────────────────────────────┐
│  X if you know Y                    [theme toggle]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Learn tool X if you already know Y                 │
│  ─────────────────────────────────                  │
│  Pick a comparison:                                 │
│                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ jj ← git    │  │ pijul ← git │  │ nix ← brew  │ │
│  │ VCS         │  │ VCS         │  │ Package Mgr │ │
│  │ [12 steps]  │  │ [8 steps]   │  │ [10 steps]  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### Tool Comparison Landing Page (e.g., /jj-git)

Includes summary, key differences, and link to **Cheat Sheet** page.
```
┌─────────────────────────────────────────────────────┐
│  ← Back                jj ← git              [0/12] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  # Why jj over git?                                 │
│                                                     │
│  jj (Jujutsu) is a VCS that treats your working    │
│  copy as a commit. No staging area. Automatic      │
│  rebasing. First-class conflicts.                  │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ Key Differences                              │   │
│  ├─────────────────────────────────────────────┤   │
│  │ • Working copy IS a commit                  │   │
│  │ • No index/staging area                     │   │
│  │ • Change IDs (stable across rebases)        │   │
│  │ • Conflicts stored in commits               │   │
│  │ • Automatic descendant rebasing             │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  [Start Learning →]                                 │
│                                                     │
│  ─────────────────────────────────────────────────  │
│  Steps Overview:                                    │
│                                                     │
│  1. □ Installation & Setup                          │
│  2. □ Basic Concepts: Working Copy as Commit        │
│  3. □ Your First Commits                            │
│  4. □ Viewing History (jj log vs git log)           │
│  ...                                                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### Step Page (Progression Content)
```
┌─────────────────────────────────────────────────────┐
│  ← Overview           Step 3 of 12           [→]   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  # Your First Commits                               │
│                                                     │
│  ┌──────────────────┬──────────────────┐           │
│  │ git              │ jj               │           │
│  ├──────────────────┼──────────────────┤           │
│  │ $ git add .      │ # auto-tracked   │           │
│  │ $ git commit     │ $ jj describe    │           │
│  │   -m "message"   │   -m "message"   │           │
│  │                  │ $ jj new         │           │
│  └──────────────────┴──────────────────┘           │
│                                                     │
│  ## The Mental Shift                                │
│                                                     │
│  In git, you stage changes then commit.            │
│  In jj, your working copy IS already a commit.     │
│  Changes are auto-tracked.                         │
│                                                     │
│  > TIP: Think of `jj new` as "I'm done with this   │
│  > commit, start a new one"                        │
│                                                     │
│  ## Try It                                          │
│                                                     │
│  ```bash                                           │
│  $ echo "hello" > file.txt                         │
│  $ jj status        # already tracked!             │
│  $ jj describe -m "Add greeting"                   │
│  $ jj new           # start next commit            │
│  ```                                               │
│                                                     │
│  ───────────────────────────────────────────────── │
│  [← Previous]                        [Next Step →] │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Components

1. **ComparisonCard** - Home page tool pairing selector
2. **StepProgress** - Shows current step / total
3. **SideBySide** - Two-column command comparison
4. **CodeBlock** - Syntax-highlighted code with copy button
5. **Callout** - Tips, warnings, notes (minimal styling)
6. **Navigation** - Prev/Next step buttons
7. **StepList** - Checklist of all steps with completion state

### Accessibility (WCAG 2.1 AA)

- Contrast ratio ≥ 7:1 for all text
- Keyboard navigation throughout
- Skip links for main content
- Semantic HTML (article, nav, aside)
- Focus indicators on all interactive elements
- Reduced motion respect

---

## Technical Architecture

### Stack (Following finn conventions)

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| React | React 19 |
| Language | TypeScript 5 (strict) |
| Effects | Effect-TS 3 |
| Styling | Tailwind CSS 4 |
| Content | MDX with gray-matter |
| Linting | Biome |
| Testing | Vitest + Playwright |
| Runtime | Bun |

### Project Structure

**Monorepo with two packages:**

```
toolkata/
├── packages/
│   ├── web/                        # Frontend (Vercel)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── page.tsx                    # Home - tool pairings
│   │   │   │   ├── [toolPair]/
│   │   │   │   │   ├── page.tsx                # Landing/summary page
│   │   │   │   │   ├── cheatsheet/
│   │   │   │   │   │   └── page.tsx            # Quick reference table
│   │   │   │   │   └── [step]/
│   │   │   │   │       └── page.tsx            # Individual step
│   │   │   │   └── layout.tsx
│   │   │   ├── components/
│   │   │   │   ├── ui/
│   │   │   │   │   ├── CodeBlock.tsx
│   │   │   │   │   ├── SideBySide.tsx
│   │   │   │   │   ├── Callout.tsx
│   │   │   │   │   ├── StepProgress.tsx
│   │   │   │   │   ├── ComparisonCard.tsx
│   │   │   │   │   └── InteractiveTerminal.tsx # xterm.js component
│   │   │   │   └── mdx/
│   │   │   │       └── MDXComponents.tsx
│   │   │   ├── content/
│   │   │   │   ├── pairings.ts
│   │   │   │   └── comparisons/
│   │   │   │       └── jj-git/
│   │   │   │           ├── index.mdx
│   │   │   │           ├── cheatsheet.mdx
│   │   │   │           ├── 01-installation.mdx
│   │   │   │           └── ...
│   │   │   ├── services/
│   │   │   │   ├── content.ts
│   │   │   │   └── sandbox-client.ts   # API client for sandbox
│   │   │   ├── lib/
│   │   │   ├── hooks/
│   │   │   └── core/
│   │   ├── package.json
│   │   └── next.config.ts
│   │
│   └── sandbox-api/                # Sandbox API (Self-hosted VPS)
│       ├── src/
│       │   ├── index.ts            # Entry point
│       │   ├── services/
│       │   │   ├── container.ts    # Docker container management
│       │   │   ├── session.ts      # Session lifecycle
│       │   │   ├── websocket.ts    # Terminal WebSocket proxy
│       │   │   └── rate-limit.ts   # Rate limiting
│       │   ├── lib/
│       │   │   └── docker.ts       # Dockerode wrapper
│       │   └── routes/
│       │       └── sessions.ts     # REST + WS endpoints
│       ├── docker/
│       │   ├── Dockerfile          # Sandbox container image
│       │   └── entrypoint.sh
│       ├── package.json
│       └── deploy/
│           ├── sandbox-api.service # Systemd unit
│           └── Caddyfile           # Reverse proxy config
│
├── package.json                    # Workspace root
├── biome.json
├── tsconfig.json
└── PLAN.md
```

### Content Schema (MDX Frontmatter)

```yaml
---
title: "Your First Commits"
step: 3
description: "Learn the fundamental difference in how jj handles commits"
gitCommands: ["git add", "git commit"]
jjCommands: ["jj describe", "jj new"]
---
```

### Tool Pairing Registry

```typescript
// src/content/pairings.ts
export const toolPairings = [
  {
    slug: "jj-git",
    from: { name: "git", description: "Distributed VCS" },
    to: { name: "jj", description: "Jujutsu VCS" },
    category: "Version Control",
    steps: 12,
    status: "published"
  },
  // Future pairings...
] as const
```

---

## Interactive Sandbox Architecture

### Overview

Each tutorial step includes an interactive terminal where users can execute real commands in a sandboxed environment. The sandbox supports **any CLI tool** (git, jj, pijul, nix, etc.) - not limited to version control.

**Key Requirements:**
- Completely sandboxed (no access to host filesystem/network)
- Ephemeral (created on demand, destroyed after session)
- Safe for untrusted input
- Low latency terminal experience
- Self-hosted on existing Hetzner/OVH VPS

### Why Not Browser-Based Solutions?

| Solution | Limitation |
|----------|------------|
| [WebContainers](https://webcontainers.io/) | Only supports WASM binaries; can't run native tools like jj, git, pijul |
| [isomorphic-git](https://isomorphic-git.org/) | JS reimplementation with feature gaps; no jj support; CORS issues |
| Client-side emulation | Can't run real native binaries |

**Conclusion:** Need server-side execution with proper isolation.

### Recommended Architecture: Docker + gVisor

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (Vercel)                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Next.js App                                             │   │
│  │  - Static pages + MDX content                            │   │
│  │  - xterm.js terminal component                           │   │
│  │  - Connects to separate Sandbox API                      │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
         │                                    │
         │ REST (create session)              │ WebSocket (terminal I/O)
         ▼                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│              SANDBOX API (Hetzner/OVH/Oracle VPS)               │
│                     sandbox.toolkata.dev                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  API Server (Effect-TS + Bun/Node)                       │   │
│  │                                                          │   │
│  │  POST /sessions          → Create ephemeral container    │   │
│  │  WS   /sessions/:id/ws   → Terminal WebSocket            │   │
│  │  DELETE /sessions/:id    → Destroy container             │   │
│  │                                                          │   │
│  │  - Rate limiting (per IP)                                │   │
│  │  - Session timeout management                            │   │
│  │  - Container lifecycle (create on demand, auto-destroy)  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              │ Docker API (unix socket)         │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Ephemeral Containers (created on demand)                │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐                    │   │
│  │  │Session A│ │Session B│ │Session C│                    │   │
│  │  │ gVisor  │ │ gVisor  │ │ gVisor  │                    │   │
│  │  │git + jj │ │git + jj │ │git + jj │                    │   │
│  │  └─────────┘ └─────────┘ └─────────┘                    │   │
│  │                                                          │   │
│  │  - No pre-warmed pool (true on-demand creation)          │   │
│  │  - ~1-2s startup time acceptable for tutorial UX         │   │
│  │  - Auto-destroyed after timeout or disconnect            │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Sandbox Container Design

**Base Image:** `toolkata-sandbox`

```dockerfile
FROM debian:bookworm-slim

# Install tools for all supported comparisons
RUN apt-get update && apt-get install -y \
    git \
    curl \
    # Add more tools as needed
    && rm -rf /var/lib/apt/lists/*

# Install jj (Jujutsu)
RUN curl -fsSL https://github.com/jj-vcs/jj/releases/latest/download/jj-linux-x86_64.tar.gz \
    | tar -xz -C /usr/local/bin

# Install other tools per comparison (pijul, nix, etc.)
# ...

# Create non-root user
RUN useradd -m -s /bin/bash sandbox
USER sandbox
WORKDIR /home/sandbox/workspace

# Pre-configure git/jj for sandbox user
RUN git config --global user.name "Sandbox User" && \
    git config --global user.email "sandbox@toolkata.dev" && \
    jj config set --user user.name "Sandbox User" && \
    jj config set --user user.email "sandbox@toolkata.dev"
```

### Security Hardening

**Docker run flags:**
```bash
docker run \
  --runtime=runsc \              # gVisor for kernel isolation
  --read-only \                  # Read-only root filesystem
  --tmpfs /home/sandbox:size=50M \ # Writable tmpfs for workspace
  --tmpfs /tmp:size=10M \        # Writable /tmp
  --network=none \               # No network access
  --memory=128m \                # Memory limit
  --cpus=0.5 \                   # CPU limit
  --pids-limit=50 \              # Process limit
  --cap-drop=ALL \               # Drop all capabilities
  --security-opt=no-new-privileges \ # No privilege escalation
  --ulimit nofile=64:64 \        # File descriptor limit
  toolkata-sandbox
```

**gVisor (runsc):** Provides kernel-level isolation by intercepting syscalls. Even if code escapes the container, it can't access the host kernel directly.

**Alternative: Firecracker microVMs** (for higher security requirements)
- Boot time: ~125ms
- Memory overhead: <5 MiB per VM
- Full hardware virtualization via KVM
- Used by AWS Lambda, Fly.io

### Session Lifecycle

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   IDLE       │───▶│   STARTING   │───▶│   RUNNING    │
│  (no container)   │  (container   │    │  (WebSocket  │
│              │    │   creating)   │    │   connected) │
└──────────────┘    └──────────────┘    └──────────────┘
                                               │
       ┌───────────────────────────────────────┘
       │
       ▼
┌──────────────┐    ┌──────────────┐
│   IDLE       │◀───│  DESTROYING  │
│              │    │  (cleanup)   │
└──────────────┘    └──────────────┘

Timeouts:
- Inactivity timeout: 5 minutes (no input)
- Max session duration: 30 minutes
- Container destroyed immediately on disconnect
```

### API Design (Effect-TS)

```typescript
// src/services/sandbox.ts
import { Context, Data, Effect, Layer } from "effect"

// Error types
export class SandboxError extends Data.TaggedClass("SandboxError")<{
  readonly cause: "RateLimited" | "PoolExhausted" | "Timeout" | "ContainerFailed"
  readonly message: string
}> {}

// Service interface
export interface SandboxServiceShape {
  readonly createSession: (toolPair: string) => Effect.Effect<Session, SandboxError>
  readonly executeCommand: (sessionId: string, command: string) => Effect.Effect<void, SandboxError>
  readonly destroySession: (sessionId: string) => Effect.Effect<void, SandboxError>
  readonly getSessionStream: (sessionId: string) => Effect.Effect<ReadableStream<Uint8Array>, SandboxError>
}

export class SandboxService extends Context.Tag("SandboxService")<
  SandboxService,
  SandboxServiceShape
>() {}
```

### Frontend Terminal Component

```typescript
// src/components/ui/InteractiveTerminal.tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { Terminal } from "@xterm/xterm"
import { FitAddon } from "@xterm/addon-fit"
import { WebLinksAddon } from "@xterm/addon-web-links"

interface Props {
  readonly toolPair: string
  readonly stepId: string
  readonly preloadCommands?: readonly string[]  // Commands to show as hints
}

export function InteractiveTerminal({ toolPair, stepId, preloadCommands }: Props) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<"connecting" | "ready" | "error">("connecting")

  // Terminal setup with xterm.js
  // WebSocket connection to sandbox API
  // Session management
  // ...
}
```

### Step Page with Interactive Terminal

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Overview           Step 3 of 12                       [→]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  # Your First Commits                                           │
│                                                                 │
│  ┌─────────────────────────┬─────────────────────────┐         │
│  │ git                     │ jj                      │         │
│  ├─────────────────────────┼─────────────────────────┤         │
│  │ $ git add .             │ # auto-tracked          │         │
│  │ $ git commit -m "msg"   │ $ jj describe -m "msg"  │         │
│  │                         │ $ jj new                │         │
│  └─────────────────────────┴─────────────────────────┘         │
│                                                                 │
│  ## Try It Yourself                                             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ sandbox@toolkata:~/workspace$                            │   │
│  │ $ echo "hello" > file.txt                               │   │
│  │ $ jj status                                              │   │
│  │ Working copy changes:                                    │   │
│  │ A file.txt                                               │   │
│  │ $ jj describe -m "Add greeting"                         │   │
│  │ Working copy now at: kpqxywon 8a4f2b1c Add greeting     │   │
│  │ $ █                                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│  [Reset Sandbox]                              [Session: 4:32]   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Hosting Considerations

**Available Infrastructure:**
- Hetzner VPS
- OVHCloud VPS
- Oracle Cloud (generous free tier: 4 ARM cores, 24GB RAM)

**Recommended Setup:**

| Role | Provider | Specs | Purpose |
|------|----------|-------|---------|
| Frontend (Next.js) | Vercel / Any | - | Static + API routes |
| Sandbox API | Hetzner/OVH/Oracle | 4 vCPU, 8GB+ RAM | Container orchestration |
| Sandbox containers | Same VPS | - | Ephemeral execution |

**Oracle Cloud Free Tier** is particularly attractive:
- 4 ARM Ampere cores, 24GB RAM (always free)
- Excellent for running many concurrent sandbox containers
- ARM-compatible images needed (jj has ARM builds)

**Software Requirements:**
- Docker with gVisor runtime (or Kata Containers for ARM)
- Reverse proxy (Caddy/nginx) for WebSocket + HTTPS
- Systemd service for sandbox API

**Estimated Resource Usage:**
| Component | Memory | CPU |
|-----------|--------|-----|
| Sandbox API | 256MB | 0.5 |
| Per container | 128MB | 0.5 |
| 30 concurrent | ~4GB | ~15 |

**Cost:** Existing infrastructure - no additional cost.

### Rate Limiting & Abuse Prevention

```typescript
// Rate limits per IP
const RATE_LIMITS = {
  sessionsPerHour: 10,      // Max new sessions per hour
  commandsPerMinute: 60,    // Max commands per minute
  maxConcurrentSessions: 2, // Max concurrent per IP
} as const
```

**Additional protections:**
- Command allowlist (optional, per tool comparison)
- Output size limits (prevent memory exhaustion)
- Automatic session cleanup on abuse detection

### Sandbox API Endpoints

```
POST   /sessions
       Body: { toolPair: "jj-git", stepId: "03" }
       Response: { sessionId: "abc123", wsUrl: "wss://sandbox.toolkata.dev/sessions/abc123/ws" }

       Creates ephemeral container on demand.
       Returns WebSocket URL for terminal connection.

GET    /sessions/:id
       Response: { status: "running" | "stopped", createdAt, expiresAt }

       Check session status.

DELETE /sessions/:id
       Response: { success: true }

       Immediately destroy container and cleanup.

WS     /sessions/:id/ws
       Bidirectional terminal I/O.
       Client sends: keystrokes, resize events
       Server sends: terminal output, status updates
```

### Fallback: Static Mode

If sandbox is unavailable or rate-limited, show static code blocks with:
- Pre-recorded terminal output (asciinema-style)
- Expected output for each command
- "Try locally" instructions with copy-paste commands

---

## Content Plan: jj ← git

### Steps (12 total)

1. **Installation & Setup** - Installing jj, colocated repos
2. **Mental Model** - Working copy as commit, no staging
3. **Creating Commits** - jj describe, jj new
4. **Viewing History** - jj log, revsets basics
5. **Navigating Commits** - jj edit, jj new <parent>
6. **Amending & Squashing** - jj squash, jj split
7. **Branches → Bookmarks** - jj bookmark, no "current branch"
8. **Handling Conflicts** - First-class conflicts, resolution
9. **Rebasing** - Automatic descendant rebasing
10. **Undo & Recovery** - jj undo, jj op log, jj evolog
11. **Working with Remotes** - jj git push/fetch
12. **Advanced: Revsets** - Powerful commit selection

---

## Implementation Steps

### Phase 1: Frontend Project Setup
- [ ] Initialize Next.js 16 project with Bun
- [ ] Configure TypeScript (strict, following finn)
- [ ] Set up Biome linting
- [ ] Configure Tailwind CSS 4
- [ ] Set up Effect-TS
- [ ] Configure Vercel deployment

### Phase 2: Frontend Core Infrastructure
- [ ] Create MDX loading service (Effect-TS)
- [ ] Define content schemas (Zod)
- [ ] Set up tool pairing registry
- [ ] Create base layout with typography

### Phase 3: Frontend Components
- [ ] Build CodeBlock component (syntax highlighting)
- [ ] Build SideBySide comparison component
- [ ] Build Callout component
- [ ] Build StepProgress indicator
- [ ] Build ComparisonCard for home page
- [ ] Build Navigation (prev/next)
- [ ] Build InteractiveTerminal component (xterm.js)

### Phase 4: Frontend Pages
- [ ] Home page with pairing grid
- [ ] Tool comparison landing page
- [ ] Cheat sheet page
- [ ] Step page with MDX rendering + interactive terminal
- [ ] localStorage progress tracking

### Phase 5: Sandbox API (Separate Service)
- [ ] Initialize sandbox-api project (Effect-TS + Bun)
- [ ] Build Docker base image with git + jj
- [ ] Implement session management service
- [ ] Implement container lifecycle (create/destroy on demand)
- [ ] Add WebSocket terminal proxy (dockerode + ws)
- [ ] Add rate limiting and abuse prevention
- [ ] Configure gVisor runtime for isolation
- [ ] Set up systemd service on VPS
- [ ] Configure Caddy reverse proxy (HTTPS + WSS)
- [ ] Add health checks and monitoring

### Phase 6: Content (jj ← git)
- [ ] Write summary/landing page MDX
- [ ] Write cheat sheet MDX (command mapping table)
- [ ] Write all 12 step MDX files with interactive exercises
- [ ] Add code examples and comparisons
- [ ] Define sandbox preload scripts per step

### Phase 7: Polish
- [ ] Add keyboard navigation
- [ ] Test accessibility (axe, keyboard)
- [ ] Add local progress persistence
- [ ] Performance optimization
- [ ] Fallback static mode when sandbox unavailable

---

## Verification Plan

### Frontend (packages/web)
1. **Dev server** - `bun run dev` and manually test all routes
2. **Type check** - `bun run typecheck` (zero errors)
3. **Lint** - `bun run lint` (zero errors)
4. **Build** - `bun run build` (successful production build)
5. **Accessibility** - Test with keyboard-only navigation
6. **Content** - Verify all 12 jj steps render correctly

### Sandbox API (packages/sandbox-api)
1. **Unit tests** - `bun run test` for session/container services
2. **Integration test** - Create session, execute commands, verify isolation
3. **Security test** - Verify container can't access host filesystem/network
4. **Load test** - Verify VPS handles expected concurrent sessions
5. **Timeout test** - Verify containers auto-destroy after inactivity

### End-to-End
1. **Full flow** - Complete jj tutorial step with real sandbox
2. **Fallback** - Verify static mode works when sandbox unavailable
3. **WebSocket reconnection** - Test terminal survives network blips

---

## Decisions Made

- **Name**: toolkata
- **Progress**: localStorage only (no accounts)
- **Cheat sheets**: Yes, include per comparison
- **Interactivity**: Interactive sandboxed terminals from day one
- **Architecture**: Monorepo with separate frontend (Vercel) and sandbox API (self-hosted)
- **Sandbox isolation**: Docker + gVisor, ephemeral containers created on demand
- **Hosting**: Frontend on Vercel, Sandbox API on Hetzner/OVH/Oracle Cloud VPS

## Future Enhancements (Out of Scope for MVP)

- User accounts with cross-device sync
- Community-contributed tool pairings
- Dark/light theme toggle
- Firecracker microVMs (upgrade from gVisor if needed)
- Pre-warmed container pool (for faster startup)
- Multiple tool versions per comparison
- Collaborative/shared terminal sessions
