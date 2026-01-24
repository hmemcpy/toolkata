# Implementation Plan: Gap Analysis & Prioritized Tasks

> **Last Updated:** 2026-01-25 (P1.1 Glossary Page Route Completed)
> **Planning Mode:** Complete Gap Analysis (Verified & Confirmed)
> **Scope:** 5 specifications analyzed against existing codebase
> **Status:** Implementation in progress (2 of ~15 tasks completed)
>
> **Analysis Method:** Parallel subagents analyzed specs, existing codebase, and specific component implementations to identify gaps.

---

## Executive Summary

After analyzing all 5 specification documents against the current implementation through parallel codebase exploration, here's what's **already implemented** vs. what's **missing**:

### Already Implemented (Baseline)

| Feature | Status | Notes |
|---------|--------|-------|
| Core interactive sandbox terminal | ✅ Complete | xterm.js + WebSocket with PTY detection |
| MDX content loading with frontmatter validation | ✅ Complete | Zod schemas, 12 step files exist |
| TerminalSidebar with collapsible UI | ✅ Complete | Desktop (400px) + MobileBottomSheet |
| **TryIt component** | ✅ Complete | Editable commands, expected output, Enter key support (enhanced 2026-01-25) |
| TerminalContext for state management | ✅ Complete | State machine, command queue, session persistence |
| Progress tracking with localStorage | ✅ Complete | ProgressStore with SSR-compatible cookie sync |
| Glossary data module | ✅ Complete | 35 command mappings, 8 categories, search/filter |
| Effect-TS backend services | ✅ Complete | Container, Session, WebSocket, RateLimit, Audit, CircuitBreaker |
| Docker container with git + jj | ✅ Complete | Chainguard wolfi-base, ~197MB, hardened |
| **Terminal state callbacks** | ✅ Complete | Invoked via `useEffect` (InteractiveTerminal.tsx:227-235) |
| **gVisor runtime integration** | ✅ Complete | Runtime field set when enabled (container.ts:176-178) |
| **ShrinkingLayout component** | ✅ Complete | Applies margin-right when sidebar open (ShrinkingLayout.tsx:52-63) |
| **All routes exist** | ✅ Complete | Home, overview, 12 steps, cheatsheet, **glossary** ✅ NEW, help, about, terms (17 total) |

### Missing Features (Specified but Not Implemented)

| Specification | Status | Missing Components |
|--------------|--------|-------------------|
| **bidirectional-comparison.md** | ⚠️ 25% Complete | DirectionToggle, PreferencesStore, useDirection (glossary route ✅ COMPLETE) |
| **terminal-sidebar.md** | ⚠️ 85% Complete | Swipe gesture, focus trap, `t` key shortcut |
| **sandbox-integration.md** | ⚠️ 75% Complete | TryIt R3 ✅ COMPLETE, R4 (per-tool-pair images) |
| **multi-environment-sandbox.md** | ❌ 0% Complete | Environment registry, config.yml, init protocol, multi-environment Dockerfiles |
| **toolkata.md** | ✅ Complete | Base requirements already implemented |

---

## Gap Analysis by Specification

### 1. bidirectional-comparison.md

**Status:** ⚠️ **PARTIALLY IMPLEMENTED** (25% complete - glossary route ✅ COMPLETE 2026-01-25)

**Verification:**
- ❌ `DirectionToggle` component does not exist
- ❌ `PreferencesStore` class does not exist (only `ProgressStore` exists)
- ❌ `useDirection` hook does not exist
- ❌ `SideBySide` component does NOT accept `isReversed` prop (only `fromCommands`, `toCommands`, `fromLabel`, `toLabel`)
- ✅ **Glossary page route EXISTS** at `/packages/web/app/[toolPair]/glossary/page.tsx` ✅ NEW
- ✅ Glossary data EXISTS at `/packages/web/content/glossary/jj-git.ts` (35 entries, 8 categories)
- ✅ `GlossaryClient` component EXISTS with search/filter functionality
- ✅ Glossary is NOW accessible at `/jj-git/glossary` route ✅ NEW

**Missing Components:**
- DirectionToggle component (header toggle switch in terminal bracket style `[git ↔ jj]`)
- useDirection hook (follows `useStepProgress` pattern)
- PreferencesStore class (localStorage persistence, follows `ProgressStore` pattern)
- SideBySide component `isReversed` prop support

**Files to Create:**
1. `packages/web/components/ui/DirectionToggle.tsx` - Toggle switch with `role="switch"`, `aria-checked`
2. `packages/web/core/PreferencesStore.ts` - localStorage for direction preference
3. `packages/web/hooks/useDirection.ts` - Hook to read/write direction preference

**Files to Modify:**
1. `packages/web/components/ui/SideBySide.tsx` - Add `isReversed?: boolean` prop, swap columns when true
2. `packages/web/components/ui/StepProgress.tsx` - Include `<DirectionToggle />` in header
3. `packages/web/app/[toolPair]/layout.tsx` - Provide PreferencesStore context at layout level
4. `packages/web/app/[toolPair]/glossary/page.tsx` - Respect direction preference (reuse GlossaryClient)

---

### 2. terminal-sidebar.md

**Status:** ✅ **MOSTLY IMPLEMENTED** (85% complete)

**Already Implemented:**
- ✅ TerminalSidebar component exists with 400px width
- ✅ MobileBottomSheet for viewports < 1024px
- ✅ TryIt component sends commands to terminal
- ✅ TerminalContext for state management
- ✅ Floating ToggleButton (TerminalToggle.tsx)
- ✅ Session persistence across navigation

**Missing Components:**
- ❌ Swipe-to-close gesture on mobile bottom sheet
- ❌ Focus trap within sidebar (uses `inert` on body instead)
- ❌ Keyboard shortcut `t` to toggle sidebar

**Files to Modify:**
1. `packages/web/components/ui/MobileBottomSheet.tsx` - Add swipe gesture
2. `packages/web/components/ui/TerminalSidebar.tsx` - Improve focus management
3. `packages/web/hooks/useKeyboardNavigation.ts` - Add `t` key handler

---

### 3. sandbox-integration.md

**Status:** ✅ **MOSTLY IMPLEMENTED** (75% complete - R3 COMPLETED 2026-01-25)

**Verification:**
- ✅ **R1:** Terminal state callbacks ARE invoked (InteractiveTerminal.tsx:227-235)
- ✅ **R2:** Shrinking layout IS implemented (ShrinkingLayout.tsx:52-63)
- ✅ **R3:** TryIt enhanced with editable commands and expected output (COMPLETED 2026-01-25)
- ✅ **R5:** gVisor runtime IS configured (container.ts:176-178)
- ✅ TerminalContext state machine exists with proper transitions
- ✅ TerminalSidebar displays terminal with status indicator
- ✅ TryIt component executes commands via TerminalContext

**Missing Components:**
- ❌ **R4:** Single Docker image instead of per-tool-pair images
  - Only `packages/sandbox-api/docker/Dockerfile` exists
  - No base image + tool-pair extension structure
  - Image naming is `toolkata-sandbox:latest`, not `toolkata-sandbox:jj-git`

**Files to Create:**
1. `packages/sandbox-api/docker/base/Dockerfile` - Debian, sandbox user, shell
2. `packages/sandbox-api/docker/tool-pairs/jj-git/Dockerfile` - FROM base, install git+jj
3. `scripts/docker-build-all.sh` - Build all images

**Files to Modify:**
1. `packages/sandbox-api/docker/Dockerfile` - Split into base + tool-pair structure
2. `packages/sandbox-api/src/services/container.ts` - Update image name to use tool-pair suffix

---

### 4. multi-environment-sandbox.md

**Status:** ❌ **NOT IMPLEMENTED** (0% complete)

**Verification:**
- ❌ `packages/sandbox-api/src/environments/` directory does NOT exist
- ❌ Frontmatter schema does NOT support `sandbox.enabled`, `sandbox.environment`, `sandbox.timeout`, `sandbox.init`
- ❌ No `config.yml` loading in content system
- ❌ No `config.yml` files exist in `packages/web/content/comparisons/jj-git/`
- ❌ SessionService only accepts `toolPair: string` parameter (no environment/init/timeout)
- ❌ ContainerService only accepts `toolPair: string` parameter (no environment selection)
- ❌ WebSocket handler does NOT accept `init` message type
- ❌ `/api/v1/environments` endpoint does NOT exist
- ❌ Only one Dockerfile exists (`packages/sandbox-api/docker/Dockerfile`)
- ❌ Current architecture: single-container with dev/prod environment switching (not multi-environment)

**Missing Components (All):**
- ❌ Environment registry system at `packages/sandbox-api/src/environments/`
- ❌ Frontmatter schema extension for `sandbox` field
- ❌ Tool pair `config.yml` loading and resolution
- ❌ Per-environment Docker images (node, python beyond bash)
- ❌ Init command protocol in WebSocket handler
- ❌ `/api/v1/environments` endpoint
- ❌ Session creation extended for environment/init/timeout params

**Files to Create:**
1. `packages/sandbox-api/src/environments/types.ts` - EnvironmentConfig interface
2. `packages/sandbox-api/src/environments/index.ts` - getEnvironment(), listEnvironments()
3. `packages/sandbox-api/src/environments/builtin.ts` - bash, node, python configs
4. `packages/sandbox-api/src/environments/plugins/.gitkeep` - Plugin directory
5. `packages/sandbox-api/docker/bash/Dockerfile` - Move current Dockerfile here
6. `packages/sandbox-api/docker/node/Dockerfile` - FROM bash, install Node.js LTS
7. `packages/sandbox-api/docker/python/Dockerfile` - FROM bash, install Python 3
8. `packages/web/content/comparisons/jj-git/config.yml` - Default sandbox settings

**Files to Modify:**
1. `packages/web/lib/content/schemas.ts` - Add `sandbox?: { enabled?, environment?, timeout?, init? }` to stepFrontmatterSchema
2. `packages/web/lib/content-core/loader.ts` - Load `config.yml`, resolve defaults with fallback
3. `packages/web/services/sandbox-client.ts` - Send `environment`, `init`, `timeout` in session creation
4. `packages/web/components/ui/InteractiveTerminal.tsx` - Accept `sandboxConfig` prop, handle init messages
5. `packages/web/app/[toolPair]/[step]/page.tsx` - Load sandbox config from frontmatter
6. `packages/sandbox-api/src/services/container.ts` - Accept `environment` param, lookup image
7. `packages/sandbox-api/src/services/session.ts` - Store `init`, `timeout` on session
8. `packages/sandbox-api/src/services/websocket.ts` - Handle `init` message, execute silently
9. `packages/sandbox-api/src/routes/sessions.ts` - Accept `environment`, `init`, `timeout` in POST body
10. `packages/sandbox-api/src/routes/index.ts` - Add GET `/api/v1/environments` endpoint
11. `packages/sandbox-api/src/index.ts` - Startup image validation

---

## Prioritized Task List

### P0 - Critical Foundation (Quick Wins)

#### P0.1: Enhanced TryIt Component ✅ COMPLETED (2026-01-25)
**Status:** ✅ **COMPLETE**

**Why:** Editable commands + expected output are core UX improvements. TryIt is used throughout MDX content, so this enhances every lesson immediately.

**Files:** `packages/web/components/ui/TryIt.tsx`

**Changes Made:**
- ✅ Added `expectedOutput?: string` prop
- ✅ Added `editable?: boolean` prop (default true)
- ✅ Replaced static `<code>` display with editable `<input>`
- ✅ Track edited command value in local state
- ✅ Style expected output as muted terminal text
- ✅ Update button to send input value instead of original command
- ✅ Added `$` prompt prefix for terminal aesthetic
- ✅ Added Enter key support to run command

**Acceptance Criteria:**
- ✅ Command appears in input field (not static code)
- ✅ User can edit command before clicking "Run"
- ✅ Expected output displays below command when provided
- ✅ "Run" button sends current input value
- ✅ Falls back to original command if not edited

**Validation:** Type check, lint, and build all pass.

---

### P1 - High Value Features (User-Facing)

#### P1.1: Glossary Page Route ✅ COMPLETED (2026-01-25)
**Status:** ✅ **COMPLETE**

**Why:** Data already exists (35 command mappings) - just needs a page. High-value reference feature, quickest win.

**Files Created:**
- `packages/web/app/[toolPair]/glossary/page.tsx`

**Changes Made:**
- ✅ Created new route page that renders `<GlossaryClientWrapper />`
- ✅ Reused existing GlossaryClient component (already complete)
- ✅ Followed same layout pattern as cheatsheet page
- ✅ Added generateStaticParams for jj-git pairing
- ✅ Added generateMetadata for SEO

**Acceptance Criteria:**
- ✅ Route `/jj-git/glossary` loads successfully (verified in build output)
- ✅ Displays 35 command mappings in table (inherited from GlossaryClient)
- ✅ Search and filter work (already implemented in GlossaryClient)
- ✅ Responsive on mobile (horizontal scroll inherited from GlossaryClient)
- ✅ Copy buttons work (inherited from GlossaryClient)

**Validation:** Type check, lint, and build all pass.

---

#### P1.2: Bidirectional Comparison - Direction Toggle
**Why:** Key user-facing feature for "bilingual" developers. Enables viewing comparisons from either perspective (git→jj OR jj→git).

**Files to Create:**
- `packages/web/core/PreferencesStore.ts` - Follow ProgressStore pattern for localStorage persistence
- `packages/web/hooks/useDirection.ts` - Hook to read/write direction preference
- `packages/web/components/ui/DirectionToggle.tsx` - Toggle switch in terminal bracket style `[git ↔ jj]`

**Files to Modify:**
- `packages/web/components/ui/SideBySide.tsx` - Add `isReversed?: boolean` prop, swap columns when true
- `packages/web/components/ui/StepProgress.tsx` - Include `<DirectionToggle />` in header
- `packages/web/app/[toolPair]/layout.tsx` - Provide PreferencesStore context at layout level
- `packages/web/app/[toolPair]/glossary/page.tsx` - Respect direction preference (reuse GlossaryClient)

**Acceptance Criteria:**
- Toggle displays as `[git ↔ jj]` in header
- Click swaps to `[jj ↔ git]` and updates all SideBySide components
- Preference stored in localStorage under `toolkata_preferences`
- On page load, reads preference and applies (default: git→jj)
- SideBySide columns swap when reversed (jj left/green, git right/orange)
- Glossary page respects direction preference
- Touch target >= 44px for mobile
- Accessible: `role="switch"`, `aria-checked`, keyboard support

**Effort:** 5 hours

**Dependencies:** None (but do after P1.1 so glossary page exists)

---

#### P1.3: Per-Tool-Pair Docker Images
**Why:** Foundation for multi-environment support. Improves modularity and prepares architecture for future tool pairs.

**Files to Create:**
- `packages/sandbox-api/docker/base/Dockerfile` - Chainguard wolfi-base, sandbox user, shell config
- `packages/sandbox-api/docker/tool-pairs/jj-git/Dockerfile` - FROM base, install git+jj, configure identities
- `scripts/docker-build-all.sh` - Build base image + all tool-pair images

**Files to Modify:**
- `packages/sandbox-api/docker/Dockerfile` - Split into base + tool-pair structure (move existing content)
- `packages/sandbox-api/src/services/container.ts` - Update image name to `toolkata-sandbox:${toolPair}`

**Acceptance Criteria:**
- Base image builds successfully (~150MB without git/jj)
- jj-git image builds successfully (~197MB with git+jj)
- Build script builds both images in correct order
- ContainerService uses correct image based on toolPair
- All existing tests pass (git/jj workflow, UTF-8, security hardening)

**Effort:** 3 hours

**Dependencies:** None (but required for P2 multi-environment work)

---

### P2 - Multi-Environment System (Complex Feature)

#### P2.1: Environment Registry (Backend)
**Why:** Core infrastructure for multi-environment sandbox. Defines available environments (bash, node, python) and their configurations.

**Files to Create:**
- `packages/sandbox-api/src/environments/types.ts` - EnvironmentConfig interface, EnvironmentError types
- `packages/sandbox-api/src/environments/index.ts` - getEnvironment(), listEnvironments() services
- `packages/sandbox-api/src/environments/builtin.ts` - Registry of bash, node, python configs
- `packages/sandbox-api/src/environments/plugins/.gitkeep` - Plugin directory for future

**Changes:**
- Define EnvironmentConfig with: name, dockerImage, defaultTimeout, initCommands, description
- Create getEnvironment(name) Effect service that returns config or NotFound error
- Create listEnvironments() Effect service that returns all available environments
- Register bash (current), node (future), python (future) environments

**Acceptance Criteria:**
- Environment registry can be queried for available environments
- getEnvironment("bash") returns valid config
- getEnvironment("unknown") returns NotFound error
- listEnvironments() returns array of all registered environments
- Uses Effect-TS patterns (TaggedClass errors, Layer composition)

**Effort:** 3 hours

**Dependencies:** P1.3 (per-tool-pair image structure must exist first)

---

#### P2.2: Frontend Configuration Loading
**Why:** Required for per-step sandbox config. Enables content authors to disable terminal or specify environment per step.

**Files to Create:**
- `packages/web/content/comparisons/jj-git/config.yml` - Define default sandbox settings for jj-git

**Files to Modify:**
- `packages/web/lib/content/schemas.ts` - Add `sandbox?: { enabled?, environment?, timeout?, init? }` to stepFrontmatterSchema
- `packages/web/lib/content-core/loader.ts` - Load `config.yml`, resolve defaults with fallback
- `packages/web/lib/content/types.ts` - Add SandboxConfig type

**Changes:**
- Extend Zod schema to support optional `sandbox` object in frontmatter
- Implement config.yml loading (similar to MDX loading)
- Create merge strategy: step frontmatter → tool-pair config → global defaults
- Update Content<T> types to include resolved sandbox config

**Acceptance Criteria:**
- Frontmatter accepts `sandbox.enabled`, `sandbox.environment`, `sandbox.timeout`, `sandbox.init`
- config.yml loads successfully for each tool pair
- Defaults merge correctly (step → config → global)
- Invalid values in frontmatter fail validation with clear errors
- Missing config.yml falls back to global defaults

**Effort:** 3 hours

**Dependencies:** None (can be done in parallel with P2.1)

---

#### P2.3: Backend Services Extension
**Why:** Wire environment system into container/session creation. Enables per-session environment selection and init commands.

**Files to Modify:**
- `packages/sandbox-api/src/services/container.ts` - Accept `environment` param, lookup image from registry
- `packages/sandbox-api/src/services/session.ts` - Store `init`, `timeout` on session
- `packages/sandbox-api/src/services/websocket.ts` - Handle `init` message type, execute silently
- `packages/sandbox-api/src/routes/sessions.ts` - Accept `environment`, `init`, `timeout` in POST body
- `packages/sandbox-api/src/routes/index.ts` - Add GET `/api/v1/environments` endpoint
- `packages/sandbox-api/src/environments/layer.ts` - Create Environment Layer for dependency injection

**Changes:**
- ContainerService.create() accepts `environment?: string` parameter
- ContainerService looks up Docker image from environment registry (defaults to "bash")
- SessionService.create() accepts `init?: string[]`, `timeout?: number` parameters
- SessionService stores init/timeout on session object
- WebSocket handler recognizes `{type: "init"}` message
- WebSocket executes init commands silently (suppresses output to client)
- WebSocket sends `{type: "initComplete", success: boolean}` when done
- POST /api/v1/sessions accepts environment, init, timeout in request body

**Acceptance Criteria:**
- Session creation with `environment: "node"` uses node Docker image
- Session creation with `init: ["npm install"]` runs commands before user gains control
- Init commands execute silently (no output visible to user)
- Init timeout kills process and returns error
- GET /api/v1/environments returns list of available environments
- Invalid environment returns 400 with available environments list

**Effort:** 5 hours

**Dependencies:** P2.1 (environment registry), P2.2 (config loading - optional but good for testing)

---

#### P2.4: Frontend Integration
**Why:** Connect frontend to multi-environment backend. Enables step pages to request specific environments and init commands.

**Files to Modify:**
- `packages/web/services/sandbox-client.ts` - Send `environment`, `init`, `timeout` in session creation
- `packages/web/components/ui/InteractiveTerminal.tsx` - Accept `sandboxConfig` prop, handle init messages
- `packages/web/contexts/TerminalContext.tsx` - Add sandbox config to state
- `packages/web/app/[toolPair]/[step]/page.tsx` - Load sandbox config from frontmatter, pass to terminal

**Changes:**
- SandboxClient.createSession() accepts optional `environment`, `init`, `timeout` parameters
- InteractiveTerminal accepts `sandboxConfig?: {enabled, environment, timeout, init}` prop
- InteractiveTerminal doesn't render if `sandboxConfig.enabled === false`
- InteractiveTerminal handles `initComplete` WebSocket message
- Step pages load sandbox config from frontmatter and pass to terminal
- Step change auto-detects config change and triggers re-initialization

**Acceptance Criteria:**
- Step with `sandbox.enabled: false` doesn't show terminal or TryIt buttons
- Step with `sandbox.environment: "node"` creates session with Node.js environment
- Step with `sandbox.init: ["npm install"]` runs init commands on session start
- Terminal shows "Initializing..." briefly, then clean prompt
- Step navigation triggers re-init when config changes
- Step with no sandbox config uses defaults from config.yml

**Effort:** 4 hours

**Dependencies:** P2.2 (config loading), P2.3 (backend services)

---

#### P2.5: Multi-Environment Docker Images
**Why:** Provide actual runtime environments (bash, node, python). Enables content authors to create lessons for different programming languages.

**Files to Create:**
- `packages/sandbox-api/docker/bash/Dockerfile` - Move current Dockerfile here (base + git/jj)
- `packages/sandbox-api/docker/node/Dockerfile` - FROM bash, install Node.js LTS, npm
- `packages/sandbox-api/docker/python/Dockerfile` - FROM bash, install Python 3, pip

**Files to Modify:**
- `scripts/docker-build-all.sh` - Build all 3 environment images
- `scripts/hetzner/deploy.sh` - Call `docker:build` before restart
- `packages/sandbox-api/src/environments/builtin.ts` - Update image references

**Changes:**
- bash image: Current jj-git image (git, jj installed)
- node image: Extend bash, add Node.js LTS (20.x), npm
- python image: Extend bash, add Python 3.12, pip
- Build script builds all images in parallel where possible
- Deploy script builds images before restarting server

**Acceptance Criteria:**
- All 3 images build successfully
- Image sizes reasonable (< 500MB each)
- node image can run `node --version` and `npm install`
- python image can run `python --version` and `pip install`
- All security tests pass (no curl/wget, non-root user)
- Deploy script successfully builds and deploys all images

**Effort:** 3 hours

**Dependencies:** P1.3 (per-tool-pair image structure must exist)

---

#### P2.6: Startup Validation
**Why:** Fail fast if images missing at server startup. Prevents runtime errors when user requests unavailable environment.

**Files to Modify:**
- `packages/sandbox-api/src/index.ts` - Add image existence check before HTTP server starts
- `packages/sandbox-api/src/environments/index.ts` - Add validateAllImages() Effect

**Changes:**
- On server startup, check that all registered environment images exist
- Use Dockerode to list images and verify presence
- Log error and exit with code 1 if any image is missing
- Provide clear error message listing missing images

**Acceptance Criteria:**
- Server checks for bash, node, python images on startup
- Missing images cause server to exit with clear error
- Startup logs show which images are missing
- All images present → server starts normally
- Checks happen before HTTP server listens

**Effort:** 1 hour

**Dependencies:** P2.5 (all environment images must be defined)

---

### P3 - Polish & UX Improvements

#### P3.1: Mobile Bottom Sheet Swipe Gesture
**Why:** Expected mobile UX pattern. Bottom sheets should be dismissible with swipe down.

**Files:** `packages/web/components/ui/MobileBottomSheet.tsx`

**Changes:**
- Add touch event handlers for drag gesture
- Track Y position during drag
- Close sheet if dragged down > 100px
- Provide visual feedback during drag (opacity/transform)
- Use `prefer-reduced-motion` to disable animation if requested

**Acceptance Criteria:**
- Swipe down closes bottom sheet on mobile
- Drag threshold: 100px down
- Visual feedback during drag (sheet follows finger partially)
- Sheet springs back if drag < threshold
- Animation disabled for `prefer-reduced-motion`
- Works on iOS Safari (webkit prefix handling)

**Effort:** 2 hours

**Dependencies:** None

---

#### P3.2: Focus Management Improvements
**Why:** Accessibility - focus trap in sidebar, return focus on close. Improves keyboard navigation experience.

**Files:** `packages/web/components/ui/TerminalSidebar.tsx`

**Changes:**
- Implement focus trap when sidebar opens
- Trap focus within sidebar (Tab cycles within, not escape)
- Return focus to trigger element when sidebar closes
- Add `aria-modal="true"` to sidebar
- Manage focus for floating toggle button

**Acceptance Criteria:**
- Focus moves to sidebar when opened
- Tab cycles within sidebar (doesn't escape to main content)
- Escape closes sidebar and returns focus to trigger
- Sidebar close button receives initial focus
- TryIt button focus restored after sidebar close
- Works with keyboard only (no mouse)

**Effort:** 1.5 hours

**Dependencies:** None

---

#### P3.3: Keyboard Navigation Enhancements
**Why:** Power user feature - `t` to toggle terminal. Improves efficiency for keyboard-heavy users.

**Files:** `packages/web/hooks/useKeyboardNavigation.ts`

**Changes:**
- Add `t` key handler to toggle sidebar
- Only trigger when not focused on input field
- Prevent default browser behavior
- Add to keyboard shortcut help (`?` key modal)

**Acceptance Criteria:**
- `t` key toggles terminal sidebar open/closed
- `t` doesn't trigger when focused on input/textarea
- `t` works on all pages within tool pair
- Keyboard shortcut help lists `t` as "Toggle terminal"
- Works with Shift+T too

**Effort:** 30 minutes

**Dependencies:** None

---

#### P3.4: Testing & Documentation
**Why:** Ensure quality and maintainability. Prevents regressions and helps future contributors.

**Changes:**
- Add Playwright tests for bidirectional comparison (toggle click, persistence)
- Add Playwright tests for glossary page (search, filter, copy)
- Add Playwright tests for step change with re-init (multi-environment)
- Document multi-environment plugin API in README
- Update IMPLEMENTATION_PLAN.md with completion status

**Acceptance Criteria:**
- Direction toggle test verifies preference persists after refresh
- Glossary search test verifies results filter correctly
- Step navigation test verifies re-init triggers on environment change
- Plugin API documentation explains how to add new environments
- All tests pass consistently

**Effort:** 4 hours

**Dependencies:** P1.1, P1.2, P2.4 (features must be implemented first)

---

## Dependencies & Task Order

```
P0 (Quick Wins) - Can be done in parallel
└── P0.1: Enhanced TryIt (2h) [NO DEPENDENCIES]

P1 (High Value) - Mostly independent
├── P1.1: Glossary Page Route (1h) [NO DEPENDENCIES - QUICKEST WIN]
├── P1.2: Bidirectional Comparison (5h) [DO AFTER P1.1 so glossary page exists]
└── P1.3: Per-Tool-Pair Docker Images (3h) [REQUIRED FOR P2]

P2 (Multi-Environment) - Complex, depends on P1.3
├── P2.1: Environment Registry (3h) [depends on P1.3]
├── P2.2: Frontend Config Loading (3h) [can parallel with P2.1]
├── P2.3: Backend Services Extension (5h) [depends on P2.1]
├── P2.4: Frontend Integration (4h) [depends on P2.2, P2.3]
├── P2.5: Multi-Environment Docker Images (3h) [depends on P1.3]
└── P2.6: Startup Validation (1h) [depends on P2.5]

P3 (Polish) - Can be done anytime
├── P3.1: Mobile Swipe Gesture (2h) [NO DEPENDENCIES]
├── P3.2: Focus Management (1.5h) [NO DEPENDENCIES]
├── P3.3: Keyboard Nav (30min) [NO DEPENDENCIES]
└── P3.4: Testing & Documentation (4h) [depends on P1.1, P1.2, P2.4]
```

---

## Quick Start Implementation Path

### For Fastest User-Facing Impact (8 hours, 3 major features)

**Recommended order:** P0.1 → P1.1 → P1.2

1. **P1.1: Glossary Page Route** (1 hour) - QUICK WIN
   - Create `/jj-git/glossary` route
   - Reuse existing GlossaryClient component
   - Data already exists (35 command mappings)
   - Immediate value for users

2. **P0.1: Enhanced TryIt** (2 hours)
   - Add editable commands + expected output
   - Improves every lesson immediately
   - TryIt used throughout MDX content

3. **P1.2: Bidirectional Comparison** (5 hours)
   - Direction toggle for "bilingual" developers
   - High-value feature for power users
   - Glossary page already exists from P1.1

**Total: ~8 hours for 3 major features**

---

### For Complete Implementation (37.5 hours)

**Phase 1: Quick Wins** (8 hours)
- P1.1: Glossary Page (1h)
- P0.1: Enhanced TryIt (2h)
- P1.2: Direction Toggle (5h)

**Phase 2: Foundation** (3 hours)
- P1.3: Per-Tool-Pair Docker Images (3h)

**Phase 3: Multi-Environment** (19 hours)
- P2.1: Environment Registry (3h)
- P2.2: Config Loading (3h) [parallel with P2.1]
- P2.3: Backend Services (5h)
- P2.4: Frontend Integration (4h)
- P2.5: Docker Images (3h) [parallel with P2.2-P2.4]
- P2.6: Startup Validation (1h)

**Phase 4: Polish** (7.5 hours)
- P3.1: Swipe Gesture (2h)
- P3.2: Focus Management (1.5h)
- P3.3: Keyboard Nav (30min)
- P3.4: Testing & Docs (4h) [do after features are complete]

---

## Validation Commands

```bash
# Type check
bun run typecheck

# Lint
bun run lint

# Build
bun run build

# Run automated route tests
./scripts/test-all.sh

# Run Playwright tests
cd packages/web && bun run test
```

---

## Verification Status

### Verified Components (2026-01-25)

| Component | Location | Status | Notes |
|-----------|----------|--------|-------|
| **Content Loading** | `packages/web/lib/content/` | ✅ Complete | MDX parsing, frontmatter validation, 12 step files exist |
| **ContentService** | `packages/web/services/content.ts` | ✅ Complete | Effect-TS service with caching, loadStep/listStep helpers |
| **SandboxClient** | `packages/web/services/sandbox-client.ts` | ✅ Complete | Session lifecycle, WebSocket support, API key auth |
| **InteractiveTerminal** | `packages/web/components/ui/InteractiveTerminal.tsx` | ✅ Complete | xterm.js, WebSocket, PTY detection, circuit breaker |
| **TerminalContext** | `packages/web/contexts/TerminalContext.tsx` | ✅ Complete | State machine, command queue, session persistence |
| **TerminalSidebar** | `packages/web/components/ui/TerminalSidebar.tsx` | ✅ Complete | Resizable, lazy-loaded terminal, status indicator |
| **ShrinkingLayout** | `packages/web/components/ui/ShrinkingLayout.tsx` | ✅ Complete | Applies margin-right when sidebar open |
| **TryIt** | `packages/web/components/ui/TryIt.tsx` | ⚠️ Partial | Command execution works, lacks editable/expectedOutput |
| **SideBySide** | `packages/web/components/ui/SideBySide.tsx` | ⚠️ Partial | Displays comparison, lacks isReversed prop |
| **GlossaryClient** | `packages/web/components/ui/GlossaryClient.tsx` | ✅ Complete | Search/filter UI, 35 command mappings |
| **ProgressStore** | `packages/web/core/ProgressStore.ts` | ✅ Complete | localStorage persistence, step completion tracking |
| **ContainerService** | `packages/sandbox-api/src/services/container.ts` | ✅ Complete | Docker lifecycle, gVisor support, security hardening |
| **SessionService** | `packages/sandbox-api/src/services/session.ts` | ✅ Complete | Timeout management, activity tracking, auto-cleanup |
| **WebSocketService** | `packages/sandbox-api/src/services/websocket.ts` | ✅ Complete | PTY proxy, input validation, message size limits |
| **RateLimitService** | `packages/sandbox-api/src/services/rate-limit.ts` | ✅ Complete | Per-IP limits, sliding windows, dev mode bypass |
| **Dockerfile** | `packages/sandbox-api/docker/Dockerfile` | ⚠️ Partial | Works for jj-git, lacks per-tool-pair structure |

### Missing Components

| Component | Required By | Priority |
|-----------|-------------|----------|
| DirectionToggle | bidirectional-comparison.md | P1 |
| PreferencesStore | bidirectional-comparison.md | P1 |
| useDirection hook | bidirectional-comparison.md | P1 |
| Glossary page route | bidirectional-comparison.md | P1 |
| Environment registry | multi-environment-sandbox.md | P2 |
| Per-environment Dockerfiles | multi-environment-sandbox.md | P2 |
| Init command protocol | multi-environment-sandbox.md | P2 |

### Key Findings

1. **Terminal Integration is Production-Ready**: The InteractiveTerminal component is sophisticated with PTY detection, message buffering, circuit breaker, and proper cleanup.

2. **Backend is Solid Effect-TS**: All backend services follow Effect-TS patterns correctly with TaggedClass errors, Layer composition, and proper error handling.

3. **Content System is Complete**: 12 MDX step files exist with proper frontmatter, loading infrastructure works, glossary data is ready.

4. **Main Gaps are Frontend Features**: Bidirectional comparison, glossary page route, and TryIt enhancements are all straightforward frontend additions.

5. **Multi-Environment Requires Refactoring**: The biggest change is restructuring Docker images and adding environment registry - this is architectural work.

---

## Notes

1. **VERIFIED by parallel subagent analysis (2026-01-25):**
   - ✅ Terminal state synchronization callbacks ARE invoked (InteractiveTerminal.tsx:227-235)
   - ✅ gVisor runtime IS configured when enabled (container.ts:176-178)
   - ✅ ShrinkingLayout component EXISTS and works (ShrinkingLayout.tsx:52-63)
   - ✅ All 16 routes exist and load correctly
   - ✅ Glossary data is complete (35 mappings across 8 categories)
   - ✅ GlossaryClient component EXISTS with full search/filter functionality
   - ❌ Glossary page route does NOT exist (only accessible via cheatsheet)

2. **Glossary is the quickest win** - Data exists, component exists, just needs a route. P1.1 can be done in 1 hour.

3. **TryIt enhancement is high-impact** - Used throughout all 12 lesson steps, so P0.1 improves the entire tutorial experience immediately.

4. **Bidirectional comparison is spec-ready but completely unimplemented** - Requires 4 new files and modifications to 3 existing files. No code exists yet.

5. **Multi-environment is the most complex feature** - Requires coordinated changes across frontend (3 files), backend (7 files), and infrastructure (4 Dockerfiles).建议 splitting into phases.

6. **All backend services follow Effect-TS patterns correctly** - TaggedClass errors, Layer composition, proper error handling. This consistency makes P2 implementation straightforward.

7. **Per-tool-pair Docker images are the gateway to multi-environment** - P1.3 establishes the pattern that P2 builds upon (base + tool-pair → base + environments).

8. **Mobile UX polish (P3)** can be done anytime - No dependencies, but swipe gesture is the most expected pattern for mobile users.

9. **Codebase quality is high** - TypeScript strict mode, Biome linting, proper abstractions. This makes implementation faster and less error-prone.
