# Multi-Environment Sandbox

## Overview

Extends the sandbox system to support multiple runtime environments (bash, node, python, etc.) with per-step configuration, custom initialization commands, and different Docker images per environment.

## User Stories

- [ ] **Content author**: I can disable the terminal for specific steps (e.g., conceptual lessons don't need a terminal)
- [ ] **Content author**: I can specify different runtime environments per step (bash shell, Node.js REPL, Python REPL)
- [ ] **Content author**: I can provide initialization commands that run silently before the user gains control (e.g., `git init`, `npm install`)
- [ ] **Content author**: I can set a custom timeout for long-running initialization (default 60s)
- [ ] **User**: When I navigate between steps, the sandbox session persists and re-initializes seamlessly
- [ ] **User**: The terminal shows a clean prompt after initialization (no messy npm install output)
- [ ] **Platform owner**: I can add new runtime environments via plugin modules without modifying core code
- [ ] **DevOps**: Images are built locally during deployment (no registry complexity)

## Acceptance Criteria

### Frontend

- [ ] Step frontmatter supports `sandbox.enabled`, `sandbox.environment`, `sandbox.timeout`, `sandbox.init`
- [ ] Tool pair has `config.yml` with default sandbox settings
- [ ] InteractiveTerminal respects `sandbox.enabled: false` (doesn't render)
- [ ] InteractiveTerminal accepts `sandboxConfig` prop
- [ ] Step change auto-detects and triggers re-initialization
- [ ] User sees "Initializing..." briefly, then clean prompt

### Backend

- [ ] `/api/v1/environments` endpoint lists available environments
- [ ] Session creation accepts `environment`, `init`, `timeout` parameters
- [ ] ContainerService uses different images per environment
- [ ] WebSocket handler accepts `init` message type
- [ ] Init commands execute silently (output hidden from client)
- [ ] Backend detects prompt completion and sends `initComplete` message

### Infrastructure

- [ ] Environment registry at `packages/sandbox-api/src/environments/`
- [ ] Built-in environments: bash, node, python
- [ ] Plugin directory for custom environments
- [ ] Multiple Dockerfiles: `docker/{bash,node,python}/Dockerfile`
- [ ] `scripts/docker-build-all.sh` builds all images
- [ ] `scripts/hetzner/deploy.sh` calls `docker:build`

### Configuration Resolution

```
Step frontmatter → Tool pair config.yml → Global defaults
```

Example:
```yaml
# Step 3 frontmatter
sandbox:
  enabled: true
  environment: "node"
  timeout: 120
  init: ["npm install"]

# Falls back to jj-git/config.yml if not specified
defaults:
  sandbox:
    enabled: true
    environment: "bash"
    timeout: 60
```

## Edge Cases & Error Handling

- [ ] **Environment not found**: Return 400 with list of available environments
- [ ] **Init command fails**: Log error, continue with remaining commands, send `initComplete: {success: false}` with error message
- [ ] **Init timeout**: Kill init process, return error, allow user to proceed with partial initialization
- [ ] **Step navigation without session**: Create new session with step's init commands
- [ ] **Step navigation with existing session**: Re-run init commands, clear terminal display
- [ ] **Image missing at startup**: Fail fast with clear error message

## Out of Scope

- Multi-line init commands (heredocs, scripts) - defer to future
- Init output caching/snapshots - defer to future
- Hot-reload of plugin environments - requires server restart
- Remote registry for images - build locally only
- Multiple concurrent sessions per user - one session per tool pair

## Technical Constraints

- **Effect-TS patterns**: All backend code uses Effect-TS for composition and error handling
- **Strict TypeScript**: No `any`, `!`, `as` assertions
- **Bun runtime**: Use `bun` commands, never npm/yarn
- **Biome linting**: 2-space indent, 100 char width, no semicolons
- **Hidden init output**: Init commands execute silently, environment info documented in MDX
- **Single-line commands only**: No heredoc or multi-script support in v1
