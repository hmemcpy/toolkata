# Implementation Plan: Sandbox Integration

> **Scope**: Multiple related files | **Risk**: Aggressive | **Validation**: bun run typecheck && bun run lint && bun run build

---

## Code Style Guidelines

### Non-Negotiable Rules

| Rule | Forbidden | Required |
|------|-----------|----------|
| No `any` | `const x: any` | `const x: unknown` + type guard |
| No `!` assertions | `arr[0]!` | `arr[0]` and handle `undefined` |
| No `as` assertions | `obj as Type` | Type guard + narrowing |
| Index access | Direct use without check | Check for `undefined` first |
| Explicit returns | Implicit return types | All exported functions typed |
| Readonly default | `items: string[]` | `items: readonly string[]` |
| Option import | `import { Option }` | `import * as Option from "effect/Option"` |
| Loops | `forEach` | `for...of` |

---

## Summary

**Sandbox Integration**: Wire terminal state callbacks, implement shrinking layout (non-blocking sidebar), enhance TryIt with expected output and editable commands, reorganize Docker to per-tool-pair images, and add gVisor runtime for security.

**Priority Order**: State wiring (P0) → UI changes (P1) → Docker/gVisor (P2) → Testing (P3)

---

## Gap Analysis (Updated 2026-01-23)

### Spec Status

| Spec File | Status | Notes |
|-----------|--------|-------|
| `specs/toolkata.md` | Core requirements | Base project scope - mostly implemented |
| `specs/terminal-sidebar.md` | In progress | P0-P1 tasks address this |
| `specs/sandbox-integration.md` | **DEPLOYED** | Sandbox API live at https://sandbox.toolkata.com |
| `specs/bidirectional-comparison.md` | **INTENTIONALLY SKIPPED** | Direction toggle removed in commit `5aa8203` - NOT implementing |

### Already Implemented ✓

| Component | Location | Status |
|-----------|----------|--------|
| TerminalContext | `contexts/TerminalContext.tsx` | Provider exists with state/isOpen/sessionTimeRemaining |
| TerminalSidebar | `components/ui/TerminalSidebar.tsx` | Desktop sidebar with lazy-loaded InteractiveTerminal |
| MobileBottomSheet | `components/ui/MobileBottomSheet.tsx` | Mobile bottom sheet with swipe-to-close |
| TerminalToggle | `components/ui/TerminalToggle.tsx` | FAB button for sidebar toggle |
| TryIt | `components/ui/TryIt.tsx` | MDX component with command + Run button + debounce |
| InteractiveTerminal | `components/ui/InteractiveTerminal.tsx` | xterm.js with WebSocket, state machine |
| **InteractiveTerminal useEffects** | Lines 383-390 | ✓ `onStateChange` and `onSessionTimeChange` callbacks ARE called |
| **InteractiveTerminal internal reset()** | Line 526 | ✓ Reset function exists but NOT exposed via ref |
| ContainerService | `sandbox-api/src/services/container.ts` | Docker container management with security hardening |
| SessionService | `sandbox-api/src/services/session.ts` | Session lifecycle, timeout handling |
| RateLimitService | `sandbox-api/src/services/rate-limit.ts` | 10/hour, 2 concurrent per IP |
| Oracle deployment | `scripts/oracle/` | provision.sh, setup-server.sh, deploy.sh, teardown.sh |
| **Hetzner deployment** | `scripts/hetzner/` | ✓ provision.sh, deploy.sh, README.md, sandbox.env |
| **Sandbox API deployed** | https://sandbox.toolkata.com | ✓ Live on Hetzner CAX11 (€3.79/mo) |
| **Docker + gVisor** | Hetzner server | ✓ Docker 29.1.5 + gVisor runsc installed |
| **Dockerfile optimized** | `sandbox-api/docker/Dockerfile` | ✓ Uses pre-built jj binaries (12s build vs 10+ min) |
| Glossary data | `content/glossary/jj-git.ts` | Command comparison data extracted |
| **Sandbox URL env var** | `packages/web/.env.example` | ✓ NEXT_PUBLIC_SANDBOX_API_URL defined |

### Not Implemented ✗

| Component | Location | Gap Details |
|-----------|----------|-------------|
| **State callback wiring** | `TerminalContext.tsx:166,170` | `_setState` and `_setSessionTimeRemaining` defined but NEVER CALLED - setters have underscore prefix indicating unused |
| **Callbacks not passed to terminal** | `TerminalSidebar.tsx:242` | `InteractiveTerminal` rendered without `onStateChange` or `onSessionTimeChange` props |
| **Callbacks not passed (mobile)** | `MobileBottomSheet.tsx:297` | Same issue as TerminalSidebar |
| **Shrinking layout** | `TerminalSidebar.tsx:149-164,188-199` | Uses backdrop overlay + inert attribute (blocking) |
| **TryIt expectedOutput** | `TryIt.tsx:25-35` | Only `command` and `description` props exist |
| **TryIt editable** | `TryIt.tsx:25-35` | Command is static `<code>`, not editable |
| **gVisor runtime in code** | `container.ts:116-133` | HostConfig has NO `Runtime` field (gVisor installed but not used) |
| **Sandbox config module** | N/A | No centralized config for gVisor/sandbox settings |
| **Reset button wiring** | `TerminalSidebar.tsx:250-254` | Reset button has empty onClick - needs to trigger InteractiveTerminal reset |
| **Reset button wiring (mobile)** | `MobileBottomSheet.tsx:305-308` | Same issue as TerminalSidebar |
| **Reset function not exposed** | `InteractiveTerminal.tsx:48-66` | `InteractiveTerminalRef` only exposes `insertCommand` and `focus`, NOT `reset` |
| **Production sandbox URL** | `packages/web/.env.local` | File doesn't exist - need to create or set env var for production |

### Key Insights

**Insight 1 - State Wiring:**
The **InteractiveTerminal ALREADY has the useEffect hooks** (lines 383-390) that call `onStateChange` and `onSessionTimeChange`. The problem is:
1. TerminalSidebar doesn't pass these callback props to InteractiveTerminal
2. TerminalContext has the setters (`_setState`, `_setSessionTimeRemaining`) but they're prefixed with underscore and never exposed/used

**Fix**: Remove underscore prefix, expose setters, pass to InteractiveTerminal via TerminalSidebar/MobileBottomSheet.

**Insight 2 - Reset Function:**
The reset button in TerminalSidebar and MobileBottomSheet has an empty onClick handler. The `reset` function exists in InteractiveTerminal (line 526) but is NOT exposed via `useImperativeHandle` (lines 437-444). Only `insertCommand` and `focus` are exposed.

**Fix**: Add `reset` to `InteractiveTerminalRef` interface and expose via useImperativeHandle.

### Verified Line Numbers (2026-01-23)

| File | Line | Content |
|------|------|---------|
| `TerminalContext.tsx` | 166 | `const [state, _setState] = useState<TerminalState>("IDLE")` |
| `TerminalContext.tsx` | 170 | `const [sessionTimeRemaining, _setSessionTimeRemaining] = useState<number \| null>(null)` |
| `TerminalSidebar.tsx` | 149-164 | useEffect that sets `inert` on `#main-content` |
| `TerminalSidebar.tsx` | 188-199 | Backdrop div with `bg-black/50` |
| `TerminalSidebar.tsx` | 242 | `<InteractiveTerminal toolPair={toolPair} stepId="sidebar" />` (no callbacks passed) |
| `TerminalSidebar.tsx` | 250-254 | Reset button with empty onClick handler |
| `MobileBottomSheet.tsx` | 297 | `<InteractiveTerminal toolPair={toolPair} stepId="mobile" />` (no callbacks passed) |
| `MobileBottomSheet.tsx` | 305-308 | Reset button with empty onClick handler |
| `InteractiveTerminal.tsx` | 48-66 | `InteractiveTerminalRef` interface - missing `reset` |
| `InteractiveTerminal.tsx` | 383-385 | useEffect calling `onStateChange?.(state)` |
| `InteractiveTerminal.tsx` | 388-390 | useEffect calling `onSessionTimeChange?.(timeRemaining)` |
| `InteractiveTerminal.tsx` | 437-444 | useImperativeHandle exposing only `insertCommand` and `focus` |
| `InteractiveTerminal.tsx` | 526 | `const reset = useCallback(...)` - reset function exists (not exposed) |
| `TryIt.tsx` | 25-35 | TryItProps interface with only `command` and `description` |
| `container.ts` | 116-133 | HostConfig without `Runtime` field |

---

## Tasks

### Phase 1: Terminal State Wiring (P0 - Foundation)

> **WHY**: Sidebar shows stale "IDLE" state because callbacks aren't connected. InteractiveTerminal already calls the callbacks - they just need to be wired up.

- [x] **1.1** Expose reset function from InteractiveTerminal
  - Location: `packages/web/components/ui/InteractiveTerminal.tsx` lines 48-66, 437-444
  - Add `reset: () => void` to `InteractiveTerminalRef` interface
  - Add `reset` to the object returned by `useImperativeHandle`
  - Update dependency array to include `reset`

- [x] **1.2** Remove underscore prefix and expose state setters
  - Location: `packages/web/contexts/TerminalContext.tsx` lines 166, 170
  - Change `_setState` → rename variable or use directly
  - Change `_setSessionTimeRemaining` → rename variable or use directly
  - Add callback functions to context value: `onTerminalStateChange` and `onTerminalTimeChange`
  - Update useMemo dependency array to include new values

- [x] **1.3** Pass callbacks from TerminalSidebar to InteractiveTerminal
  - Location: `packages/web/components/ui/TerminalSidebar.tsx` line 242
  - Get `onTerminalStateChange` and `onTerminalTimeChange` from `useTerminalContext()`
  - Pass to InteractiveTerminal: `<InteractiveTerminal ... onStateChange={onTerminalStateChange} onSessionTimeChange={onTerminalTimeChange} />`

- [x] **1.4** Wire reset button in TerminalSidebar
  - Location: `packages/web/components/ui/TerminalSidebar.tsx` lines 250-254
  - Get `terminalRef` from context or create local ref
  - Call `terminalRef.current?.reset()` in onClick handler

- [x] **1.5** Pass callbacks from MobileBottomSheet to InteractiveTerminal
  - Location: `packages/web/components/ui/MobileBottomSheet.tsx` line 297
  - Same pattern as TerminalSidebar

- [x] **1.6** Wire reset button in MobileBottomSheet
  - Location: `packages/web/components/ui/MobileBottomSheet.tsx` lines 305-308
  - Same pattern as TerminalSidebar

- [x] **1.7** Validate state wiring
  - Run `bun run typecheck && bun run lint && bun run build`
  - Manual test: Open sidebar, verify status changes from "Idle" → "Starting..." → "Connected"
  - Manual test: Verify session timer counts down in footer
  - Manual test: Click Reset button, verify terminal resets

---

### Phase 2: Shrinking Layout (P1 - UI)

> **WHY**: Current blocking overlay prevents TryIt interaction while sidebar is open. Shrinking layout enables side-by-side workflow.

- [x] **2.1** Remove backdrop from TerminalSidebar
  - Location: `packages/web/components/ui/TerminalSidebar.tsx` lines 188-199
  - Delete the backdrop `<div>` element entirely
  - Keep Escape key handling (lines 167-178)

- [x] **2.2** Remove inert attribute from TerminalSidebar
  - Location: `packages/web/components/ui/TerminalSidebar.tsx` lines 149-164
  - Delete the entire `useEffect` that sets/removes `inert` on `#main-content`
  - Content should remain interactive when sidebar is open

- [x] **2.3** Remove backdrop and inert from MobileBottomSheet
  - Location: `packages/web/components/ui/MobileBottomSheet.tsx`
  - Remove backdrop div (lines 226-238)
  - Remove inert useEffect (lines 146-160)
  - Keep swipe-to-close gesture handling

- [x] **2.4** Create ShrinkingLayout client component
  - Location: `packages/web/components/ui/ShrinkingLayout.tsx` (new file)
  - Client component that wraps children
  - Reads `isOpen` from `useTerminalContext()`
  - Applies `mr-[var(--sidebar-width)]` on desktop (`lg:`) when sidebar open
  - Uses `transition-[margin]` for smooth animation
  - Respects `prefers-reduced-motion`

- [x] **2.5** Update step page to use ShrinkingLayout
  - Location: `packages/web/app/[toolPair]/[step]/page.tsx`
  - Wrap main content with `<ShrinkingLayout>`
  - Preserve `id="main-content"` for accessibility skip link

- [x] **2.6** Test shrinking layout
  - TryIt buttons work while sidebar is open
  - Content scrolling works independently
  - No layout thrashing on rapid open/close
  - Test at lg breakpoint (1024px)

---

### Phase 3: TryIt Enhancement (P1 - UI)

> **WHY**: Users need to see expected output and optionally edit commands before running.

- [x] **3.1** Add expectedOutput prop to TryIt
  - Location: `packages/web/components/ui/TryIt.tsx` lines 25-35
  - Add `readonly expectedOutput?: string` to TryItProps interface
  - Display below command in muted monospace: `text-[var(--color-text-dim)] font-mono text-sm whitespace-pre-wrap`
  - Only render if prop is provided

- [x] **3.2** Add editable command input to TryIt
  - Location: `packages/web/components/ui/TryIt.tsx`
  - Add `readonly editable?: boolean` prop (default: `true`)
  - When editable: replace static `<code>` with controlled `<input type="text">`
  - Input styled to match monospace code appearance
  - Local state: `const [editedCommand, setEditedCommand] = useState(command)`
  - "Run" button sends `editedCommand` (not original `command`)

- [x] **3.3** Add keyboard handling to editable TryIt
  - Enter key in input triggers Run
  - Escape key resets to original command
  - Tab moves focus to Run button

- [x] **3.4** Test TryIt enhancements
  - expectedOutput displays correctly with muted styling
  - Editable input allows modification before Run
  - Keyboard shortcuts work (Enter, Escape)
  - Debounce still works with editable input
  - Existing MDX content (without new props) continues to work

---

### Phase 4: Docker Image Reorganization (P2 - Backend) - SIMPLIFIED

> **WHY**: Current single Dockerfile with pre-built jj binaries works well. Multi-image split deferred until we add more tool pairs.

- [x] **4.1** ~~Create base Dockerfile~~ **DEFERRED** - Single image sufficient for now
- [x] **4.2** ~~Create jj-git tool-pair Dockerfile~~ **DEFERRED**
- [x] **4.3** Dockerfile optimized with pre-built jj binaries
  - Location: `packages/sandbox-api/docker/Dockerfile`
  - Uses GitHub release binaries instead of cargo (12s build vs 10+ min)
  - jj 0.25.0 + git pre-installed

- [x] **4.4** Hetzner deployment scripts created
  - `scripts/hetzner/provision.sh` - Creates CAX11 ARM server
  - `scripts/hetzner/deploy.sh` - Syncs code, builds image, starts service
  - `scripts/hetzner/sandbox.env` - Server configuration
  - `scripts/hetzner/README.md` - Documentation

- [ ] **4.5** Update ContainerService for dynamic image selection (OPTIONAL)
  - Only needed when adding second tool pair
  - Current: `SANDBOX_IMAGE = "toolkata-sandbox:latest"` works fine

- [x] **4.6** ~~Delete old single Dockerfile~~ **KEPT** - Still using it
- [x] **4.7** ~~Update Oracle deploy.sh~~ **REPLACED** by Hetzner scripts

---

### Phase 5: gVisor Integration (P2 - Security)

> **WHY**: Defense-in-depth kernel isolation prevents container escape attacks.
> **STATUS**: gVisor (runsc) installed on Hetzner server, but not yet used in code.

- [x] **5.1** gVisor installed on production server
  - Hetzner server has runsc 20260112.0 installed
  - Docker configured with runsc runtime in `/etc/docker/daemon.json`
  - Verified working: `docker run --runtime=runsc --rm hello-world`

- [x] **5.2** Create sandbox config module
  - Location: `packages/sandbox-api/src/config.ts` (new file)
  - Export typed config object:
    ```typescript
    export const SandboxConfig = {
      useGvisor: process.env.SANDBOX_USE_GVISOR !== "false", // default true
      gvisorRuntime: process.env.SANDBOX_GVISOR_RUNTIME ?? "runsc",
    } as const
    ```
  - Added `validateGvisorConfig()` function for startup validation

- [ ] **5.3** Add gVisor runtime to ContainerService
  - Location: `packages/sandbox-api/src/services/container.ts` lines 116-133 (HostConfig)
  - Import `SandboxConfig`
  - Add to HostConfig: `Runtime: SandboxConfig.useGvisor ? SandboxConfig.gvisorRuntime : undefined`
  - TypeScript: Handle `undefined` runtime (Docker will use default)

- [ ] **5.4** Add gVisor availability check with graceful fallback
  - Location: `packages/sandbox-api/src/services/container.ts`
  - Create async function `checkGvisorAvailable(): Effect.Effect<boolean>`
  - Check via Docker runtime list or test container
  - Log warning if gVisor requested but unavailable
  - Fall back to runc silently in development

- [ ] **5.5** Update health endpoint with gVisor status
  - Location: `packages/sandbox-api/src/index.ts`
  - Add to health response: `gvisor: { requested: boolean, available: boolean }`
  - Helps debug production deployment issues

- [x] **5.6** ~~Update Oracle setup-server.sh~~ **DONE** via Hetzner provision.sh

---

### Phase 6: Validation & Testing (P3)

> **WHY**: Ensure all changes work together without regressions.

- [ ] **6.1** Run full validation suite
  ```bash
  bun run typecheck  # Zero errors
  bun run lint       # Zero errors
  bun run build      # All pages generate successfully
  ```

- [ ] **6.2** Update Playwright tests for shrinking layout
  - Location: `packages/web/tests/browser.spec.ts`
  - Remove/update tests that expect backdrop/inert behavior
  - Add test: TryIt button clickable while sidebar is open
  - Add test: Content scrolls independently from sidebar

- [ ] **6.3** Add tests for TryIt enhancements
  - Test: expectedOutput renders with correct styling
  - Test: Editable input accepts text changes
  - Test: Enter triggers Run, Escape resets
  - Test: Backwards compatibility (existing MDX without new props)

- [ ] **6.4** Run Playwright suite
  ```bash
  cd packages/web && bun run test
  ```

---

### Phase 7: Security & Integration Audit (P3 - Manual LLM Review)

> **WHY**: Comprehensive review of the entire sandbox system before production use. This audit must be performed manually by an LLM to identify gaps, vulnerabilities, and architectural issues that automated tests cannot catch.

- [ ] **7.1** Perform comprehensive sandbox security audit
  - Execute the audit prompt below
  - Document findings in `SECURITY_AUDIT.md`
  - Categorize issues by severity (Critical/High/Medium/Low)
  - Create follow-up tasks for any identified issues

---

#### Sandbox Security Audit Prompt

Use this prompt with an LLM to perform a comprehensive audit of the toolkata sandbox system:

````markdown
# toolkata Sandbox Security & Integration Audit

You are a security engineer and systems architect performing a comprehensive audit of the toolkata sandbox system. This system allows users to execute CLI commands (git, jj) in isolated Docker containers via a web terminal.

## Audit Scope

Analyze the following components for security vulnerabilities, architectural gaps, and integration issues:

### 1. Infrastructure & Provisioning

**Files to review:**
- `scripts/hetzner/provision.sh`
- `scripts/hetzner/deploy.sh`
- `scripts/hetzner/sandbox.env`
- `packages/sandbox-api/deploy/Caddyfile`
- `packages/sandbox-api/deploy/sandbox-api.service`

**Evaluate:**
- [ ] SSH key management and access controls
- [ ] Firewall configuration (are unnecessary ports exposed?)
- [ ] systemd service hardening (User=, ProtectSystem=, NoNewPrivileges=, etc.)
- [ ] Caddy TLS configuration (HSTS, cipher suites, certificate handling)
- [ ] Secret/credential management (API keys, environment variables)
- [ ] Server update/patching strategy
- [ ] Backup and disaster recovery provisions
- [ ] Logging and audit trail configuration

### 2. Container Isolation & Security

**Files to review:**
- `packages/sandbox-api/docker/Dockerfile`
- `packages/sandbox-api/docker/entrypoint.sh`
- `packages/sandbox-api/src/services/container.ts`

**Evaluate:**
- [ ] **Container escape vectors**: Can a malicious user escape the container?
- [ ] **gVisor integration**: Is runsc properly configured? Syscall filtering effective?
- [ ] **Network isolation**: Is `NetworkMode: "none"` sufficient? Any bypass vectors?
- [ ] **Filesystem isolation**: Read-only root, tmpfs workspace - any writable paths that could persist?
- [ ] **Resource limits**: Are Memory/CPU/PID limits sufficient to prevent DoS?
- [ ] **Capability dropping**: Are all dangerous capabilities removed?
- [ ] **User namespaces**: Is the sandbox user truly unprivileged?
- [ ] **Seccomp profile**: Is the default profile adequate or should it be more restrictive?
- [ ] **Image supply chain**: Are base images pinned? Vulnerability scanning?
- [ ] **Sensitive file access**: Can users read /etc/passwd, /proc, /sys, etc.?

### 3. API Security

**Files to review:**
- `packages/sandbox-api/src/index.ts`
- `packages/sandbox-api/src/routes/sessions.ts`
- `packages/sandbox-api/src/routes/websocket.ts`
- `packages/sandbox-api/src/services/session.ts`
- `packages/sandbox-api/src/services/rate-limit.ts`

**Evaluate:**
- [ ] **Authentication/Authorization**: Is the API properly protected? Should there be API keys?
- [ ] **Rate limiting**: Is 10/hour per IP sufficient? Can it be bypassed via proxies/VPNs?
- [ ] **Session management**: Are session IDs unguessable? Proper expiration/cleanup?
- [ ] **Input validation**: Are all inputs sanitized before use?
- [ ] **WebSocket security**: Origin validation? Message size limits? Timeout handling?
- [ ] **Error handling**: Do errors leak sensitive information?
- [ ] **CORS configuration**: Is it too permissive?
- [ ] **DoS vectors**: Can an attacker exhaust resources (connections, containers, memory)?

### 4. Command Injection & Input Sanitization

**Files to review:**
- `packages/sandbox-api/src/services/container.ts` (exec commands)
- `packages/sandbox-api/src/routes/websocket.ts` (terminal input)
- `packages/web/components/ui/TryIt.tsx`
- `packages/web/components/ui/InteractiveTerminal.tsx`

**Evaluate:**
- [ ] **Shell injection**: Can users inject shell metacharacters (;, |, &&, $(), ``) ?
- [ ] **Path traversal**: Can users access files outside workspace via ../../../?
- [ ] **Environment variable injection**: Can users manipulate PATH, LD_PRELOAD, etc.?
- [ ] **Terminal escape sequences**: Can malicious escape codes affect the host or other sessions?
- [ ] **Command allowlisting**: Should only git/jj commands be allowed?
- [ ] **Binary execution**: Can users upload and execute arbitrary binaries?

### 5. Frontend Integration

**Files to review:**
- `packages/web/services/sandbox-client.ts`
- `packages/web/components/ui/InteractiveTerminal.tsx`
- `packages/web/contexts/TerminalContext.tsx`

**Evaluate:**
- [ ] **WebSocket connection security**: Is wss:// enforced in production?
- [ ] **Credential exposure**: Are any secrets exposed to the browser?
- [ ] **XSS vectors**: Could terminal output contain malicious scripts?
- [ ] **State management**: Can session state be manipulated client-side?
- [ ] **Error handling**: Do errors expose internal details to users?

### 6. Operational Security

**Evaluate:**
- [ ] **Monitoring & alerting**: How are attacks detected?
- [ ] **Incident response**: What happens if a container is compromised?
- [ ] **Container cleanup**: Are orphaned containers properly removed?
- [ ] **Log retention**: Are logs sufficient for forensic analysis?
- [ ] **Cost controls**: Can an attacker run up infrastructure costs?

### 7. Integration Gaps

**Evaluate:**
- [ ] **Frontend ↔ API contract**: Are all error states handled?
- [ ] **Timeout handling**: What happens when containers or sessions timeout?
- [ ] **Fallback mode**: Does the frontend gracefully degrade when sandbox is unavailable?
- [ ] **Health checks**: Is the health endpoint comprehensive enough?
- [ ] **Version compatibility**: Are API versions managed?

## Deliverables

After reviewing all components, provide:

1. **Executive Summary**: Overall security posture (1-2 paragraphs)

2. **Findings Table**:
   | ID | Severity | Category | Title | File:Line | Description | Recommendation |
   |----|----------|----------|-------|-----------|-------------|----------------|
   | V-001 | Critical | ... | ... | ... | ... | ... |

3. **Severity Definitions**:
   - **Critical**: Immediate exploitation possible, container escape, RCE
   - **High**: Significant security weakness, DoS, data exposure
   - **Medium**: Defense-in-depth gap, hardening opportunity
   - **Low**: Best practice deviation, minor improvement

4. **Architecture Diagram Issues**: Any structural problems with the current design

5. **Recommended Immediate Actions**: Top 3-5 fixes to prioritize

6. **Recommended Future Improvements**: Longer-term security enhancements

## Context

- **Server**: Hetzner CAX11 ARM64 (4GB RAM, 2 vCPU) @ 46.224.239.222
- **Domain**: sandbox.toolkata.com
- **Stack**: Bun + Hono (API), Docker + gVisor (containers), Caddy (reverse proxy)
- **Container tools**: git, jj (Jujutsu VCS)
- **Session limits**: 5-minute timeout, 10 sessions/hour/IP, 2 concurrent/IP

Begin the audit by reading each file listed above and systematically evaluating against the checklist.
````

---

## File Summary

### New Files Created (6) ✓

| File | Purpose | Status |
|------|---------|--------|
| `scripts/hetzner/provision.sh` | Create Hetzner CAX11 server with Docker/gVisor/Bun/Caddy | ✓ Done |
| `scripts/hetzner/deploy.sh` | Sync code, build image, start service | ✓ Done |
| `scripts/hetzner/sandbox.env` | Server configuration (IP, type, location) | ✓ Done |
| `scripts/hetzner/README.md` | Hetzner deployment documentation | ✓ Done |
| `packages/web/components/ui/ShrinkingLayout.tsx` | Client wrapper for content margin when sidebar open | ✓ Done |
| `packages/sandbox-api/src/config.ts` | Centralized sandbox configuration (gVisor, etc.) | ✓ Done |

### New Files To Create (1)

| File | Purpose |
|------|---------|
| `SECURITY_AUDIT.md` | Deliverable from Phase 7 security audit (findings, recommendations) |

### Modified Files - Done (7) ✓

| File | Changes |
|------|---------|
| `sandbox-api/docker/Dockerfile` | ✓ Uses pre-built jj binaries from GitHub releases (12s vs 10+ min) |
| `scripts/oracle/provision.sh` | ✓ Updated to use Ubuntu 24.04 and fixed tenancy lookup |
| `packages/web/components/ui/InteractiveTerminal.tsx` | ✓ Expose `reset` function via useImperativeHandle |
| `packages/web/contexts/TerminalContext.tsx` | ✓ Expose `onTerminalStateChange` and `onTerminalTimeChange` callbacks |
| `packages/web/components/ui/TerminalSidebar.tsx` | ✓ Remove backdrop/inert, pass callbacks to InteractiveTerminal, wire reset button |
| `packages/web/components/ui/MobileBottomSheet.tsx` | ✓ Remove backdrop/inert, pass callbacks to InteractiveTerminal, wire reset button |
| `packages/web/app/[toolPair]/[step]/page.tsx` | ✓ Wrap with ShrinkingLayout |

### Modified Files - Pending (5)

| File | Changes |
|------|---------|
| `packages/web/components/ui/TryIt.tsx` | Add `expectedOutput` and `editable` props |
| `packages/sandbox-api/src/services/container.ts` | Add gVisor runtime to HostConfig |
| `packages/sandbox-api/src/index.ts` | Health endpoint gVisor status |
| `packages/web/tests/browser.spec.ts` | Update for shrinking layout, add TryIt tests |
| `packages/web/.env.local` | Create or set NEXT_PUBLIC_SANDBOX_API_URL for production |

### Deleted Files (0)

Single Dockerfile kept - multi-image split deferred.

---

## Execution Notes

### Deployment Status

**Sandbox API is LIVE at https://sandbox.toolkata.com**

| Component | Status | Details |
|-----------|--------|---------|
| Server | ✓ Running | Hetzner CAX11 (4GB RAM, 2 vCPU ARM64) @ 46.224.239.222 |
| Docker | ✓ Installed | Docker 29.1.5 |
| gVisor | ✓ Installed | runsc 20260112.0 (not yet used in code) |
| Caddy | ✓ Running | Auto-SSL via Let's Encrypt |
| sandbox-api | ✓ Running | systemd service, health check passing |
| DNS | ✓ Configured | sandbox.toolkata.com → 46.224.239.222 |

### Immediate Next Step

Configure frontend to use production sandbox:
```bash
# In packages/web/.env.local or environment
NEXT_PUBLIC_SANDBOX_API_URL=https://sandbox.toolkata.com
```

### Dependencies
- **Phase 1 MUST complete first** - state wiring is foundation for all UI
- **Phases 2-3 can run in parallel** - independent UI changes
- **Phase 5 remaining tasks** - integrate gVisor in code
- **Phase 6 runs after implementation phases** - validates everything together
- **Phase 7 can run anytime** - manual LLM audit, independent of code changes

### Validation Command (use throughout)
```bash
bun run typecheck && bun run lint && bun run build
```

### Dev Server
```bash
bun run --cwd packages/web dev
```

### Key Breakpoints
- Desktop sidebar: `lg:` (1024px+)
- Mobile bottom sheet: `<lg` (<1024px)

### Backwards Compatibility
- TryIt without `expectedOutput`/`editable` props must continue working
- Existing MDX content should not need changes

---

## Task Count

| Phase | Tasks | Priority | Description |
|-------|-------|----------|-------------|
| 1 | 7 | P0 | Terminal state wiring + reset button |
| 2 | 6 | P1 | Shrinking layout |
| 3 | 4 | P1 | TryIt enhancement |
| 4 | 7 | P2 | Docker reorganization |
| 5 | 5 | P2 | gVisor integration |
| 6 | 4 | P3 | Validation & testing |
| 7 | 1 | P3 | Security & integration audit |
| **Total** | **34** | | |

## Priority Summary

| Priority | Phases | Description |
|----------|--------|-------------|
| **P0** | 1 | Terminal state wiring + reset (foundation - blocks everything) |
| **P1** | 2, 3 | UI changes (shrinking layout, TryIt enhancements) |
| **P2** | 4, 5 | Backend changes (Docker images, gVisor security) |
| **P3** | 6, 7 | Validation, testing, and security audit |
