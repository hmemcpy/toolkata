# Multi-Environment Sandbox Design

## Overview

Extends the sandbox system to support:
1. **Disabling terminal per lesson/step** (with tool pair defaults and step overrides)
2. **Multiple environment types** (bash, node, python, extensible via plugins)
3. **Custom init commands** per step (executed before user gains control)
4. **Different Docker images** per environment type
5. **Session persistence** across steps with seamless re-initialization

---

## Terminology

| Term | Definition |
|------|------------|
| **Tool Pair** | The comparison being taught (e.g., `"jj-git"` = "jj if you know git") |
| **Step** | Individual lesson within a tool pair (1-12, e.g., `jj-git/03`) |
| **Environment Type** | Sandbox runtime type (e.g., `"bash"`, `"node"`, `"python"`) |
| **Environment Config** | Docker image + runtime command + security settings |
| **Session** | A sandbox container instance (persists across steps) |
| **Init** | Shell commands executed before user gains control |

---

## Frontmatter Schema

```yaml
---
title: "Your First Commits"
step: 3
description: "Learn the fundamental difference in how jj handles commits"
gitCommands: ["git add", "git commit"]
jjCommands: ["jj describe", "jj new"]

# NEW: Sandbox configuration
sandbox:
  # Terminal visibility (inherited from tool pair, can override per-step)
  enabled: true  # false = no terminal shown for this step

  # Environment type (maps to Docker image + runtime)
  environment: "bash"  # default, extensible

  # Init timeout in seconds (default: 60)
  timeout: 120  # for long-running installs

  # Shell initialization (executed before user gains control)
  # Each command runs in order, waits for prompt before next
  init:
    - "git init"
    - "git config user.name 'Student'"
    - "git config user.email 'student@example.com'"
    - "jj git init --colocate"
---
```

---

## Tool Pair Defaults

Each tool pair has a `config.yml` defining default sandbox settings:

```yaml
# packages/web/content/comparisons/jj-git/config.yml
defaults:
  sandbox:
    enabled: true
    environment: "bash"
    timeout: 60
```

**Resolution logic:**
1. Check step frontmatter for explicit `sandbox.*` values
2. Fall back to tool pair `config.yml` defaults
3. Fall back to global defaults (enabled=true, environment=bash, timeout=60)

---

## Environment Registry

### Location

```
packages/sandbox-api/src/environments/
├── index.ts           # Registry loader and exports
├── builtin.ts         # Built-in environments (bash, node, python)
└── plugins/
    ├── node-repl.ts   # Custom Node.js REPL environment
    └── python-venv.ts # Custom Python with venv support
```

### Environment Module Format

```typescript
// packages/sandbox-api/src/environments/plugins/node-repl.ts
import type { EnvironmentConfig } from "../types.js"

export const config: EnvironmentConfig = {
  // Docker image reference
  image: "toolkata-node:latest",

  // Command to start the interactive shell/REPL
  command: "/usr/local/bin/node",
  args: ["--interactive"],

  // Working directory inside container
  workdir: "/workspace",

  // Security settings (can override defaults)
  security: {
    network: "none",
    readonlyRootfs: true,
    memory: 256 * 1024 * 1024, // 256MB
    cpus: 0.5,
  },
}

// Optional: validation for frontmatter init commands
export const validateInit?: (commands: readonly string[]) => Error | null = (commands) => {
  const invalid = commands.filter((cmd) => cmd.startsWith("npm "))
  if (invalid.length > 0) {
    return new Error("npm commands not allowed in init (use yarn or pnpm)")
  }
  return null
}
```

### Registry Implementation

```typescript
// packages/sandbox-api/src/environments/index.ts
import { Effect } from "effect"
import type { EnvironmentConfig } from "./types.js"

// Built-in environments
import { bash, node, python } from "./builtin.js"

// Plugin environments
import * as nodeRepl from "./plugins/node-repl.js"
import * as pythonVenv from "./plugins/python-venv.js"

// Registry map (loaded at startup)
const environments = new Map<string, EnvironmentConfig>()

// Register built-ins
environments.set("bash", bash)
environments.set("node", node)
environments.set("python", python)

// Register plugins
environments.set("node-repl", nodeRepl.config)
environments.set("python-venv", pythonVenv.config)

// Public API
export const getEnvironment = (
  name: string,
): Effect.Effect<EnvironmentConfig, EnvironmentNotFoundError> =>
  Effect.sync(() => {
    const config = environments.get(name)
    if (!config) {
      return new EnvironmentNotFoundError({
        environment: name,
        available: Array.from(environments.keys()),
      })
    }
    return config
  })

export const listEnvironments = () => Array.from(environments.keys())

export class EnvironmentNotFoundError extends Data.TaggedClass(
  "EnvironmentNotFoundError",
)<{
  readonly environment: string
  readonly available: readonly string[]
}>() {}
```

---

## Docker Image Management

### Approach: Build Locally, No Registry

Images are built directly on the VPS during deployment. No registry needed for single-server setup.

### Dockerfile Structure

```
packages/sandbox-api/docker/
├── bash/
│   └── Dockerfile           # Current jj-git sandbox
├── node/
│   └── Dockerfile           # Node.js + npm + yarn
└── python/
    └── Dockerfile           # Python + pip + venv
```

### Build Script

```bash
#!/bin/bash
# scripts/docker-build-all.sh

build_image() {
  local name=$1
  echo "Building toolkata-$name:latest..."
  docker build -f docker/$name/Dockerfile -t toolkata-$name:latest .
}

build_image "bash"
build_image "node"
build_image "python"
```

### Deployment Integration

Images are built during deployment, checked at server startup:

```bash
# scripts/hetzner/deploy.sh
bun run docker:build      # Build all images locally
systemctl restart sandbox-api
```

```typescript
// packages/sandbox-api/src/index.ts
const ensureImages = Effect.gen(function* () {
  const required = ["toolkata-sandbox:latest", "toolkata-node:latest", "toolkata-python:latest"]
  for (const image of required) {
    const exists = yield* Effect.tryPromise({
      try: () => docker.getImage(image).inspect()
    })
    if (!exists) {
      yield* Effect.die(`Missing image: ${image}. Run docker:build first.`)
    }
  }
})
```

### ContainerService Changes

```typescript
// packages/sandbox-api/src/services/container.ts
const create = (options: {
  readonly toolPair: string
  readonly environment: string
  readonly init: readonly string[]
  readonly timeout?: number
}) =>
  Effect.gen(function* () {
    // Get environment config
    const envConfig = yield* getEnvironment(options.environment)

    // Image is local (built during deploy), just verify it exists
    yield* ensureImageExists(envConfig.image)

    // Create container with environment-specific config
    const container = yield* createContainer({
      toolPair: options.toolPair,
      envConfig,
    })

    return container
  })
```

---

## Session Creation Flow

### API Request

```http
POST /api/v1/sessions
Content-Type: application/json

{
  "toolPair": "jj-git",
  "step": "03",
  "environment": "bash",
  "init": ["git init", "git config user.name 'Student'"],
  "timeout": 60
}
```

### Backend Flow

```
1. Validate tool pair (jj-git is supported)
2. Get environment config (bash → toolkata-sandbox:latest)
3. Verify image exists locally (built during deploy)
4. Create container with image, security settings
5. Start container
6. Write init commands to PTY (via WebSocket injection, output hidden)
7. Wait for prompt detection (init complete)
8. Store session in memory
9. Return session ID + WebSocket URL
```

### WebSocket Init Message (Hidden Output)

When the WebSocket connects, the backend injects init commands silently:

```json
{
  "type": "init",
  "commands": ["git init", "git config user.name 'Student'"]
}
```

The WebSocket handler:
1. Writes each command to the PTY (output is discarded, not sent to client)
2. Waits for shell prompt after each command
3. Sends `initComplete` message when done:
   ```json
   {"type": "initComplete", "success": true, "duration": 1234}
   ```
4. On error:
   ```json
   {"type": "initComplete", "success": false, "error": "git: not found"}
   ```

**User sees**: Brief "Initializing..." status, then clean prompt. Init output is hidden—environment info is documented in MDX content instead.

---

## Re-Initialization on Step Change

### Frontend Detection

The `InteractiveTerminal` component listens for step changes:

```typescript
// packages/web/components/ui/InteractiveTerminal.tsx
export interface InteractiveTerminalProps {
  readonly toolPair: string
  readonly stepId: string  // When this changes, trigger re-init
  readonly sandboxConfig: ResolvedSandboxConfig
  // ...
}

useEffect(() => {
  // When stepId changes, re-initialize the sandbox
  if (state === "CONNECTED" && currentStepRef.current !== stepId) {
    reinitializeSandbox()
  }
  currentStepRef.current = stepId
}, [stepId, state])
```

### Re-Init Flow

```
User navigates Step 3 → Step 4:
┌─────────────────────────────────────────────────────────────┐
│ Frontend                                                     │
├─────────────────────────────────────────────────────────────┤
│ 1. User clicks "Step 4" link                                │
│ 2. Page navigates to /jj-git/4                              │
│ 3. InteractiveTerminal receives new stepId prop             │
│ 4. Detects step change, reads step 4 frontmatter            │
│ 5. Sends via WebSocket: {"type":"init","commands":[...]}    │
│ 6. Waits for initComplete message                           │
│ 7. Clears terminal display                                  │
│ 8. User sees fresh prompt with initialized environment      │
└─────────────────────────────────────────────────────────────┘
```

---

## Error Handling

### Init Command Failure

When an init command fails:

1. **Backend**: Logs error, continues with remaining commands, sends `initComplete` with `success: false` and `error` field
2. **Frontend**: Shows non-blocking warning banner:
   ```
   ⚠️ Initialization incomplete: git init failed. Continue anyway? [Dismiss]
   ```
3. **User**: Can dismiss warning and use terminal (environment may be partially initialized)

### Environment Not Found

If a step specifies an unknown environment:

1. **Frontend**: Validates against available environments list (from `/api/v1/environments` endpoint)
2. **Content error**: Shows error instead of terminal:
   ```
   Error: Environment 'ruby' not found. Available: bash, node, python.
   ```
3. **Fallback**: Can optionally fall back to default environment with warning

---

## API Changes

### New Endpoint: List Environments

```http
GET /api/v1/environments

{
  "environments": ["bash", "node", "python", "node-repl", "python-venv"],
  "defaults": {
    "bash": {"timeout": 60},
    "node": {"timeout": 120}
  }
}
```

### Extended Session Creation

```http
POST /api/v1/sessions

{
  "toolPair": "jj-git",
  "step": "03",
  "environment": "bash",
  "init": ["git init"],
  "timeout": 60
}

Response:
{
  "sessionId": "sess_abc123",
  "wsUrl": "ws://...",
  "status": "RUNNING",
  "createdAt": "2024-01-15T10:30:00Z",
  "expiresAt": "2024-01-15T11:00:00Z"
}
```

### WebSocket Init Message

```json
// Client → Server
{"type": "init", "commands": ["git init", "npm install"]}

// Server → Client (when init starts)
{"type": "initStarted", "commandCount": 2}

// Server → Client (when complete)
{"type": "initComplete", "success": true, "duration": 1234}

// Server → Client (on error)
{"type": "initComplete", "success": false, "error": "git: command not found", "failedCommand": "git init"}
```

---

## Frontend Changes

### Types

```typescript
// packages/web/types/frontmatter.ts
export interface SandboxConfig {
  readonly enabled?: boolean
  readonly environment?: string
  readonly timeout?: number
  readonly init?: readonly string[]
}

export interface StepFrontmatter {
  readonly title: string
  readonly step: number
  readonly description: string
  readonly gitCommands?: readonly string[]
  readonly jjCommands?: readonly string[]
  readonly sandbox?: SandboxConfig  // NEW
}
```

### Content Loader

```typescript
// packages/web/lib/content-core/loader.ts
export async function loadStep(toolPair: string, step: number) {
  const [frontmatter, toolPairConfig] = await Promise.all([
    readStepFrontmatter(toolPair, step),
    readToolPairConfig(toolPair),
  ])

  const sandboxConfig = resolveSandboxConfig(
    frontmatter.sandbox,
    toolPairConfig.defaults.sandbox,
  )

  return { frontmatter, sandboxConfig }
}

function resolveSandboxConfig(
  stepConfig: SandboxConfig | undefined,
  defaults: SandboxConfig,
): ResolvedSandboxConfig {
  return {
    enabled: stepConfig?.enabled ?? defaults.enabled ?? true,
    environment: stepConfig?.environment ?? defaults.environment ?? "bash",
    timeout: stepConfig?.timeout ?? defaults.timeout ?? 60,
    init: stepConfig?.init ?? [],
  }
}
```

### InteractiveTerminal Component

```typescript
// packages/web/components/ui/InteractiveTerminal.tsx
export interface InteractiveTerminalProps {
  readonly toolPair: string
  readonly stepId: string
  readonly sandboxConfig: ResolvedSandboxConfig
  // ... existing props
}

export const InteractiveTerminal: React.FC<InteractiveTerminalProps> = ({
  sandboxConfig,
  stepId,
  ...props
}) => {
  // Don't render if disabled
  if (!sandboxConfig.enabled) {
    return null
  }

  // Detect step change and re-init
  useEffect(() => {
    if (state === "CONNECTED" && currentStepRef.current !== stepId) {
      runReinit(sandboxConfig.init)
    }
    currentStepRef.current = stepId
  }, [stepId, state, sandboxConfig.init])

  // ... rest of component
}
```

---

## Implementation Checklist

| Phase | Task | Files | Priority |
|-------|------|-------|----------|
| **1. Types** | Add sandbox frontmatter types | `web/types/frontmatter.ts` | P0 |
| **1. Types** | Add environment config types | `sandbox-api/src/environments/types.ts` | P0 |
| **2. Registry** | Create environment registry | `sandbox-api/src/environments/index.ts` | P0 |
| **2. Registry** | Add built-in environments | `sandbox-api/src/environments/builtin.ts` | P0 |
| **3. Backend** | Update ContainerService | `sandbox-api/src/services/container.ts` | P0 |
| **3. Backend** | Add init to WebSocket handler (hidden output) | `sandbox-api/src/services/websocket.ts` | P0 |
| **3. Backend** | Add /environments endpoint | `sandbox-api/src/routes/index.ts` | P0 |
| **3. Backend** | Update session creation API | `sandbox-api/src/routes/sessions.ts` | P0 |
| **3. Backend** | Add image check at startup | `sandbox-api/src/index.ts` | P0 |
| **4. Frontend** | Add tool pair config loader | `web/lib/content-core/loader.ts` | P0 |
| **4. Frontend** | Update SandboxClient | `web/services/sandbox-client.ts` | P0 |
| **4. Frontend** | Update InteractiveTerminal (re-init, hidden init) | `web/components/ui/InteractiveTerminal.tsx` | P0 |
| **5. Content** | Add config.yml to jj-git | `web/content/comparisons/jj-git/config.yml` | P1 |
| **5. Content** | Add sandbox field to step frontmatter | `web/content/comparisons/jj-git/*-step.mdx` | P1 |
| **6. Docker** | Create Dockerfile structure | `sandbox-api/docker/{bash,node,python}/` | P1 |
| **6. Docker** | Create build script | `scripts/docker-build-all.sh` | P1 |
| **7. Deploy** | Integrate docker:build into deploy script | `scripts/hetzner/deploy.sh` | P1 |
| **8. Docs** | Document plugin API | `docs/plugins.md` | P2 |

---

## Future Enhancements

- **Snapshot/Restore**: Save container state to disk for faster cold starts
- **Init Caching**: Cache common init states (e.g., `npm install` of specific packages)
- **Concurrent Sessions**: Allow multiple sessions per user (e.g., for split-screen comparison)
- **Session Export**: Export session state as a tarball for user download
- **Custom Environments**: Allow users to define custom environments via web UI
