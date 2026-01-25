# Implementation Plan: Gap Analysis & Prioritized Tasks

> **Last Updated:** 2026-01-25
> **Planning Status:** Gap Analysis Complete - Ready for Implementation
> **Scope:** 5 specifications analyzed against existing codebase
> **Status:** P0-P1 COMPLETE, P2 Multi-environment remaining (6 tasks), P3 Polish partial (2 of 4 tasks)
>
> **Analysis Method:** Parallel subagents analyzed specs, existing codebase, and specific component implementations to identify gaps.

## Executive Summary

After analyzing all 5 specification documents against the current implementation through parallel codebase exploration, here's the **final implementation status**:

### Already Implemented (Baseline)

| Feature | Status | Notes |
|---------|--------|-------|
| Core interactive sandbox terminal | ✅ Complete | xterm.js + WebSocket with PTY detection |
| MDX content loading with frontmatter validation | ✅ Complete | Zod schemas, 12 step files exist |
| TerminalSidebar with collapsible UI | ✅ Complete | Desktop (400px) + MobileBottomSheet |
| **TryIt component** | ✅ Complete | Editable commands, expected output, Enter key support |
| TerminalContext for state management | ✅ Complete | State machine, command queue, session persistence |
| Progress tracking with localStorage | ✅ Complete | ProgressStore with SSR-compatible cookie sync |
| Glossary data module | ✅ Complete | 35 command mappings, 8 categories, search/filter |
| Effect-TS backend services | ✅ Complete | Container, Session, WebSocket, RateLimit, Audit, CircuitBreaker |
| Docker container with git + jj | ✅ Complete | Chainguard wolfi-base, ~197MB, hardened |
| **Terminal state callbacks** | ✅ Complete | Invoked via `useEffect` (InteractiveTerminal.tsx:227-235) |
| **gVisor runtime integration** | ✅ Complete | Runtime field set when enabled (container.ts:176-178) |
| **ShrinkingLayout component** | ✅ Complete | Applies margin-right when sidebar open (ShrinkingLayout.tsx:52-63) |
| **All routes exist** | ✅ Complete | Home, overview, 12 steps, cheatsheet, **glossary**, help, about, terms (17 total) |
| **Mobile bottom sheet swipe gesture** | ✅ Complete | Touch handlers, 100px threshold (MobileBottomSheet.tsx:170-233) |
| **'t' key keyboard shortcut** | ✅ Complete | Toggle terminal (useKeyboardNavigation.ts:191-197) |
| **Bidirectional comparison** | ✅ Complete | DirectionToggle, PreferencesStore, useDirection, DirectionContext |
| **Cheat Sheet page** | ✅ Complete | `/jj-git/cheatsheet` route with command mapping table |
| **Logo Preview page** | ✅ Complete | `/logo-preview` route for asset management |
| **Per-tool-pair Docker images** | ✅ Complete | Base + tool-pair structure (base/, tool-pairs/jj-git/) |

### Missing Features (Specified but Not Implemented)

| Specification | Status | Missing Components |
|--------------|--------|-------------------|
| **bidirectional-comparison.md** | ✅ **COMPLETE** | All components implemented (verified 2026-01-25) |
| **terminal-sidebar.md** | ⚠️ 95% Complete | Focus trap in sidebar only |
| **sandbox-integration.md** | ✅ **COMPLETE** | All requirements implemented (verified 2026-01-25) |
| **multi-environment-sandbox.md** | ✅ **COMPLETE** | All requirements implemented (P2.1-P2.6 verified 2026-01-25) |
| **toolkata.md** | ✅ Complete | Base requirements already implemented |

---

## Gap Analysis by Specification

### 1. toolkata.md (Base Requirements)

**Status:** ✅ **COMPLETE**

All user stories, acceptance criteria, and technical constraints have been implemented:
- Home page with tool comparison cards
- Comparison overview page with step navigation
- Step pages with MDX content, command comparisons, interactive terminal
- Cheat sheet page with command mappings
- Interactive sandbox with session management
- Progress tracking with localStorage
- Performance targets met (lazy loading, static generation)
- Accessibility (WCAG 2.1 AA) with semantic HTML, skip links, focus indicators
- Security hardening in Docker containers
- Responsive design (mobile-first, 320px minimum)

**Verification:**
- ✅ All routes exist and load correctly
- ✅ Interactive terminal with xterm.js integration
- ✅ WebSocket communication with sandbox API
- ✅ Session management with timeout handling
- ✅ localStorage persistence for progress
- ✅ Security: no network access, read-only rootfs, resource limits, gVisor support

---

### 2. bidirectional-comparison.md

**Status:** ✅ **COMPLETE** (verified 2026-01-25)

**Verification:**
- ✅ `DirectionToggle` component exists at `packages/web/components/ui/DirectionToggle.tsx`
- ✅ `PreferencesStore` class exists at `packages/web/core/PreferencesStore.ts`
- ✅ `useDirection` hook exists at `packages/web/hooks/useDirection.ts`
- ✅ `DirectionContext` exists at `packages/web/contexts/DirectionContext.tsx`
- ✅ `SideBySide` component supports direction swap via DirectionContext
- ✅ `StepProgress` component includes DirectionToggle in header
- ✅ `Providers` component includes DirectionProvider
- ✅ `GlossaryClient` component respects direction preference (swaps columns)
- ✅ Glossary page route exists at `/packages/web/app/[toolPair]/glossary/page.tsx`
- ✅ Glossary data exists at `/packages/web/content/glossary/jj-git.ts` (35 entries, 8 categories)

**Acceptance Criteria Met:**
- ✅ Toggle displays as `[git ↔ jj]` in header
- ✅ Click swaps to `[jj ↔ git]` and updates all SideBySide components
- ✅ Preference stored in localStorage under `toolkata_preferences`
- ✅ On page load, reads preference and applies (default: git→jj)
- ✅ SideBySide columns swap when reversed (jj left/green, git right/orange)
- ✅ Glossary page respects direction preference
- ✅ Touch target >= 44px for mobile (min-h-[44px] applied)
- ✅ Accessible: `role="switch"`, `aria-checked`, keyboard support (Enter/Space)

**Files Created:**
1. `packages/web/core/PreferencesStore.ts` - localStorage for direction preference
2. `packages/web/hooks/useDirection.ts` - Hook to read/write direction preference
3. `packages/web/components/ui/DirectionToggle.tsx` - Toggle switch with accessibility
4. `packages/web/contexts/DirectionContext.tsx` - React Context for direction state
5. `packages/web/app/[toolPair]/glossary/page.tsx` - Glossary page route
6. `packages/web/content/glossary/jj-git.ts` - 35 command mappings with categories

**Files Modified:**
1. `packages/web/components/ui/SideBySide.tsx` - Now client component, uses DirectionContext
2. `packages/web/components/ui/StepProgress.tsx` - Now client component, includes DirectionToggle
3. `packages/web/components/Providers.tsx` - Added DirectionProvider wrapper
4. `packages/web/components/ui/GlossaryClient.tsx` - Uses DirectionContext to swap columns

---

### 3. terminal-sidebar.md

**Status:** ⚠️ **MOSTLY IMPLEMENTED** (95% complete)

**Already Implemented:**
- ✅ TerminalSidebar component exists with 400px width
- ✅ MobileBottomSheet for viewports < 1024px
- ✅ TryIt component sends commands to terminal
- ✅ TerminalContext for state management
- ✅ Floating ToggleButton (TerminalToggle.tsx)
- ✅ Session persistence across navigation
- ✅ Swipe-to-close gesture on mobile bottom sheet (MobileBottomSheet.tsx:170-233)
- ✅ Keyboard shortcut `t` to toggle sidebar (useKeyboardNavigation.ts:191-197)
- ✅ ShrinkingLayout applies margin-right when sidebar open
- ✅ Terminal state synchronization via callbacks

**Missing Components (P3.2):**
- ⚠️ **Focus trap NOT implemented** - No useFocusTrap or custom implementation
- ⚠️ **Focus return to trigger NOT implemented** - No trigger ref stored
- ⚠️ **aria-modal is dynamic `{isOpen}`** - Should be `true` when open (line 272)

**Verification (2026-01-25):**
- Current implementation has `aria-modal={isOpen}` at line 272 (should be `true`)
- No focus trap library or custom implementation found
- No reference stored for trigger element
- Close button focuses on open (lines 205-213) but doesn't trap Tab cycles within sidebar
- Escape key handler exists (lines 216-227)

**Files to Modify:**
1. `packages/web/components/ui/TerminalSidebar.tsx` - Add focus trap, return focus to trigger, fix aria-modal

---

### 4. sandbox-integration.md

**Status:** ✅ **COMPLETE** (100% complete)

**Verification:**
- ✅ **R1:** Terminal state callbacks ARE invoked (InteractiveTerminal.tsx:227-235)
- ✅ **R2:** Shrinking layout IS implemented (ShrinkingLayout.tsx:52-63)
- ✅ **R3:** TryIt enhanced with editable commands and expected output
- ✅ **R4:** Per-tool-pair Docker images
  - `packages/sandbox-api/docker/base/Dockerfile` exists
  - `packages/sandbox-api/docker/tool-pairs/jj-git/Dockerfile` exists
  - Image naming is `toolkata-sandbox:jj-git`
  - ContainerService uses tool-pair to select correct image
- ✅ **R5:** gVisor runtime IS configured (container.ts:176-178)
- ✅ TerminalContext state machine exists with proper transitions
- ✅ TerminalSidebar displays terminal with status indicator
- ✅ TryIt component executes commands via TerminalContext

---

### 5. multi-environment-sandbox.md

**Status:** ✅ **COMPLETE** (verified 2026-01-25)

**Verification:**
- ✅ `packages/sandbox-api/src/environments/` directory EXISTS with registry
- ✅ Frontmatter schema DOES support `sandbox.enabled`, `sandbox.environment`, `sandbox.timeout`, `sandbox.init`
- ✅ `config.yml` loading EXISTS in content system
- ✅ `config.yml` files EXIST in `packages/web/content/comparisons/jj-git/`
- ✅ SessionService DOES accept `environment`, `initCommands`, `timeout` parameters
- ✅ ContainerService DOES accept `environment` parameter
- ✅ WebSocket handler DOES accept `init` message type
- ✅ `/api/v1/environments` endpoint EXISTS
- ✅ Per-environment Dockerfiles EXIST (bash, node, python)
- ✅ Startup validation EXISTS - server checks images exist before starting

**Completed Components (P2.1-P2.6):**
- ✅ Environment registry system at `packages/sandbox-api/src/environments/`
- ✅ Frontmatter schema extension for `sandbox` field
- ✅ Tool pair `config.yml` loading and resolution
- ✅ Per-environment Docker images (bash, node, python)
- ✅ Init command protocol in WebSocket handler
- ✅ `/api/v1/environments` endpoint
- ✅ Session creation extended for environment/init/timeout params
- ✅ Startup validation - validateAllImages() Effect checks all images exist

---

## Prioritized Task List

### ✅ COMPLETE - P0 & P1 (Quick Wins & High Value Features)

| Task | Status | Effort | Notes |
|------|--------|--------|-------|
| P0.1: Enhanced TryIt Component | ✅ Complete | 2h | Editable commands, expected output, Enter key |
| P1.1: Glossary Page Route | ✅ Complete | 1h | 35 command mappings, search/filter UI |
| P1.2: Bidirectional Comparison | ✅ Complete | 5h | DirectionToggle, PreferencesStore, useDirection |
| P1.3: Per-Tool-Pair Docker Images | ✅ Complete | 3h | Base + tool-pair structure |
| P3.1: Mobile Swipe Gesture | ✅ Complete | 2h | Touch handlers, 100px threshold |
| P3.3: Keyboard Navigation ('t' key) | ✅ Complete | 0.5h | Toggle terminal shortcut |

**Total Completed:** ~13.5 hours of implementation

---

### P2 - Multi-Environment System (19 hours) - NEXT PRIORITY

- [x] **P2.1: Environment Registry (Backend)** ✅ COMPLETE (2026-01-25)
**Why:** Core infrastructure for multi-environment sandbox. Defines available environments (bash, node, python) and their configurations.

**Files Created:**
- `packages/sandbox-api/src/environments/types.ts` - EnvironmentConfig interface, EnvironmentError types
- `packages/sandbox-api/src/environments/index.ts` - getEnvironment(), listEnvironments() services
- `packages/sandbox-api/src/environments/builtin.ts` - Registry of bash, node, python configs
- `packages/sandbox-api/src/environments/registry.ts` - Central registry with getEnvironment, listEnvironments functions
- `packages/sandbox-api/src/environments/plugins/.gitkeep` - Plugin directory with documentation

**Changes:**
- Defined EnvironmentConfig with: name, dockerImage, defaultTimeout, defaultInitCommands, description, category
- Created getEnvironment(name) Effect service that returns config or NotFound error
- Created listEnvironments() Effect service that returns all available environments
- Registered bash, node, python environments
- Exported EnvironmentServiceLive layer for dependency injection

**Acceptance Criteria:**
- ✅ Environment registry can be queried for available environments
- ✅ getEnvironment("bash") returns valid config with dockerImage
- ✅ getEnvironment("unknown") returns NotFound error with availableEnvironments list
- ✅ listEnvironments() returns array of all registered environments
- ✅ Uses Effect-TS patterns (TaggedClass errors, Layer composition)

**Effort:** 3 hours (actual)

**Dependencies:** P1.3 (per-tool-pair image structure must exist first)

---

- [x] **P2.2: Frontend Configuration Loading** ✅ COMPLETE (2026-01-25)
**Why:** Required for per-step sandbox config. Enables content authors to disable terminal or specify environment per step.

**Files Created:**
- `packages/web/content/comparisons/jj-git/config.yml` - Default sandbox settings (enabled: true, environment: bash, timeout: 60)
- `packages/web/lib/content-core/tool-config.ts` - Tool-pair config loader with YAML parsing

**Files Modified:**
- `packages/web/lib/content/schemas.ts` - Added `sandboxConfigSchema` to step frontmatter
- `packages/web/lib/content/types.ts` - Added `SandboxConfig`, `RawSandboxConfig`, `DEFAULT_SANDBOX_CONFIG`, `resolveSandboxConfig()`
- `packages/web/lib/content-core/index.ts` - Exported `loadToolConfig`, `DEFAULT_TOOL_CONFIG`, `ToolConfig`, `RawToolConfig`

**Changes:**
- Extended Zod schema to support optional `sandbox` object in frontmatter
  - `sandbox.enabled?: boolean`
  - `sandbox.environment?: "bash" | "node" | "python"`
  - `sandbox.timeout?: number`
  - `sandbox.init?: readonly string[]`
- Implemented config.yml loading with regex-based YAML parser (lightweight, no heavy dependencies)
- Created `resolveSandboxConfig()` merge function: step frontmatter → tool-pair config → global defaults
- Missing config.yml falls back to `DEFAULT_TOOL_CONFIG` (enabled: true, environment: bash, timeout: 60)

**Acceptance Criteria:**
- ✅ Frontmatter accepts `sandbox.enabled`, `sandbox.environment`, `sandbox.timeout`, `sandbox.init`
- ✅ config.yml loads successfully for each tool pair
- ✅ Defaults merge correctly (step → config → global)
- ✅ Zod validates environment enum values (bash/node/python)
- ✅ Missing config.yml falls back to global defaults

**Effort:** 3 hours (actual)

**Dependencies:** None (can be done in parallel with P2.1)

---

- [x] **P2.3: Backend Services Extension** ✅ COMPLETE (2026-01-25)
**Why:** Wire environment system into container/session creation. Enables per-session environment selection and init commands.

**Files Modified:**
- `packages/sandbox-api/src/services/container.ts` - Accept `environment` param, lookup image
- `packages/sandbox-api/src/services/session.ts` - Store `init`, `timeout` on session
- `packages/sandbox-api/src/services/websocket.ts` - Handle `init` message, execute silently
- `packages/sandbox-api/src/routes/sessions.ts` - Accept `environment`, `init`, `timeout`
- `packages/sandbox-api/src/index.ts` - Include EnvironmentServiceLive in layer composition

**Changes:**
- ContainerService.create() accepts `environment?: string` parameter
- ContainerService looks up Docker image from environment registry (defaults to "bash")
- SessionService.create() accepts `CreateSessionOptions` with `environment`, `initCommands`, `timeout`
- Session interface now includes `environment`, `initCommands`, `initTimeout` fields
- WebSocket handler recognizes `{type: "init"}` message type
- WebSocketService includes `executeInitCommands()` method for silent execution
- POST /api/v1/sessions accepts `environment`, `init`, `timeout` in request body with validation
- GET /api/v1/environments endpoint returns list of available environments
- EnvironmentServiceLive integrated into container and server layers

**Acceptance Criteria:**
- ✅ Session creation with `environment: "node"` uses node Docker image (via EnvironmentService)
- ✅ Session creation with `init: ["npm install"]` stores commands on session
- ✅ Init commands can be executed via WebSocketService.executeInitCommands()
- ✅ GET /api/v1/environments returns list of available environments
- ✅ Request body validates environment (string), init (array of strings), timeout (number, max 30min)
- ✅ EnvironmentService integrated into Effect-TS layer composition

**Effort:** 5 hours (actual)

**Dependencies:** P2.1 (environment registry), P2.2 (config loading - optional but good for testing)

---

- [x] **P2.4: Frontend Integration** ✅ COMPLETE (2026-01-25)
**Why:** Connect frontend to multi-environment backend. Enables step pages to request specific environments and init commands.

**Files Modified:**
- `packages/web/services/sandbox-client.ts` - Send `environment`, `init`, `timeout`
- `packages/web/components/ui/InteractiveTerminal.tsx` - Accept `sandboxConfig` prop
- `packages/web/contexts/TerminalContext.tsx` - Add sandbox config to state
- `packages/web/app/[toolPair]/[step]/page.tsx` - Load sandbox config from frontmatter
- `packages/web/components/ui/StepPageClientWrapper.tsx` - Pass sandboxConfig to context
- `packages/web/components/ui/TerminalSidebar.tsx` - Use sandboxConfig from context
- `packages/web/lib/content/types.ts` - Adjust RawSandboxConfig type for Zod compatibility

**Changes:**
- SandboxClient.createSession() accepts optional `environment`, `init`, `timeout` parameters
- InteractiveTerminal accepts `sandboxConfig?: {enabled, environment, timeout, init}` prop
- InteractiveTerminal doesn't render if `sandboxConfig.enabled === false` (TerminalSidebar returns null)
- InteractiveTerminal handles `initComplete` WebSocket message
- TerminalContext stores current sandbox config for re-initialization detection
- Step pages load sandbox config from frontmatter and pass to terminal
- Step change auto-detects config change and triggers re-initialization via setSandboxConfig
- Session storage key includes environment for isolation (e.g., `sandbox-session-jj-git-node`)

**Acceptance Criteria:**
- ✅ Step with `sandbox.enabled: false` doesn't show terminal or TryIt buttons
- ✅ Step with `sandbox.environment: "node"` creates session with Node.js environment
- ✅ Step with `sandbox.init: ["npm install"]` runs init commands on session start
- ✅ Terminal shows "Initializing..." briefly, then clean prompt (via initComplete message)
- ✅ Step navigation triggers re-init when config changes (via setSandboxConfig comparison)
- ✅ Step with no sandbox config uses defaults from config.yml

**Effort:** 4 hours (actual)

**Dependencies:** P2.2 (config loading), P2.3 (backend services)

---

- [x] **P2.5: Multi-Environment Docker Images** ✅ COMPLETE (2026-01-25)
**Why:** Provide actual runtime environments (bash, node, python). Enables content authors to create lessons for different programming languages.

**Files Created:**
- `packages/sandbox-api/docker/environments/bash/Dockerfile` - Bash environment with git and jj
- `packages/sandbox-api/docker/environments/bash/entrypoint.sh` - Bash entrypoint script
- `packages/sandbox-api/docker/environments/node/Dockerfile` - FROM bash, install Node.js LTS
- `packages/sandbox-api/docker/environments/node/entrypoint.sh` - Node entrypoint script
- `packages/sandbox-api/docker/environments/python/Dockerfile` - FROM bash, install Python 3
- `packages/sandbox-api/docker/environments/python/entrypoint.sh` - Python entrypoint script

**Files Modified:**
- `scripts/hetzner/deploy.sh` - Call `docker-build-all.sh` instead of direct docker build
- `packages/sandbox-api/scripts/docker-build-all.sh` - Updated to build environments instead of tool-pairs
- `packages/sandbox-api/package.json` - Added `docker:build:all` scripts

**Changes:**
- bash image: FROM toolkata-sandbox-base, install git + jj (Jujutsu VCS 0.25.0)
- node image: FROM toolkata-env:bash, add Node.js 20.x, npm
- python image: FROM toolkata-env:bash, add Python 3, pip
- Build script builds all images sequentially (base → bash → node → python)
- Build script includes comprehensive tests for all environments
- Deploy script now calls `./scripts/docker-build-all.sh` to build all environment images

**Acceptance Criteria:**
- ✅ All 3 environment Dockerfiles created
- ✅ Build script updated to build all environment images (base → bash → node → python)
- ✅ Deploy script updated to call docker-build-all.sh
- ✅ Package.json includes docker:build:all and docker:build:all:no-test scripts
- ✅ Image naming follows pattern: toolkata-env:bash, toolkata-env:node, toolkata-env:python
- ✅ Build script includes tests: bash (5 tests), node (3 tests), python (3 tests)

**Effort:** 3 hours (actual)

**Dependencies:** P1.3 (per-tool-pair image structure must exist)

---

- [x] **P2.6: Startup Validation** ✅ COMPLETE (2026-01-25)
**Why:** Fail fast if images missing at server startup. Prevents runtime errors when user requests unavailable environment.

**Files Modified:**
- `packages/sandbox-api/src/environments/index.ts` - Added validateAllImages() Effect, MissingImagesError type
- `packages/sandbox-api/src/index.ts` - Added validation call before HTTP server starts

**Changes:**
- Added `validateAllImages` method to EnvironmentServiceShape interface
- Created MissingImagesError TaggedClass with structured error data (envName, imageName)
- validateAllImages Effect checks all registered environments' Docker images exist
- Uses Dockerode's `getImage().inspect()` to verify image presence
- On missing images, fails with clear error listing each missing environment and its image
- Validation called in mainProgram before HTTP server starts (after gVisor and security validation)
- MissingImagesError converted to ConfigError for consistent error handling
- Success case logs count of validated images

**Acceptance Criteria:**
- ✅ Server checks for bash, node, python images on startup
- ✅ Missing images cause server to exit with clear error
- ✅ Error message lists each missing environment with its image name
- ✅ All images present → server starts normally with validation log
- ✅ Checks happen before HTTP server listens
- ✅ Error message includes build command: `bun run docker:build:all`

**Effort:** 1 hour (actual)

**Dependencies:** P2.5 (all environment images must be defined)

---

### P3 - Polish & UX Improvements

- [x] **P3.1: Mobile Bottom Sheet Swipe Gesture** ✅ COMPLETE
**Status:** ✅ **COMPLETE** (verified 2026-01-25)

**Why:** Expected mobile UX pattern. Bottom sheets should be dismissible with swipe down.

**Verification:**
- ✅ Swipe gesture EXISTS at MobileBottomSheet.tsx:170-233
- ✅ Touch handlers: `handleTouchStart`, `handleTouchMove`, `handleTouchEnd`
- ✅ Swipe threshold: 100px (line 131)
- ✅ Visual feedback with transform and opacity (lines 227-230)
- ✅ `prefer-reduced-motion` support

**Acceptance Criteria:**
- ✅ Swipe down closes bottom sheet on mobile
- ✅ Drag threshold: 100px down
- ✅ Visual feedback during drag (sheet follows finger partially)
- ✅ Sheet springs back if drag < threshold
- ✅ Works on iOS Safari (webkit prefix handling)

---

- [x] **P3.2: Focus Management Improvements** ✅ COMPLETE (2026-01-25)
**Why:** Accessibility - focus trap in sidebar, return focus on close. Improves keyboard navigation experience.

**Files Created:**
- `packages/web/hooks/useFocusTrap.ts` - Custom focus trap hook with Tab/Shift+Tab cycling

**Files Modified:**
- `packages/web/contexts/TerminalContext.tsx` - Added triggerRef, updated openSidebar/toggleSidebar/executeCommand to capture trigger
- `packages/web/components/ui/TerminalSidebar.tsx` - Integrated useFocusTrap, fixed aria-modal attribute

**Changes:**
- Created `useFocusTrap` hook that traps Tab and Shift+Tab within a container
- Added `triggerRef` to TerminalContext to store the element that opened the sidebar
- Updated `openSidebar(trigger)`, `toggleSidebar(trigger)`, and `executeCommand` to capture the active element
- `closeSidebar` now returns focus to the trigger element after 50ms delay
- Fixed `aria-modal` from dynamic `{isOpen}` to `true | undefined`
- Removed duplicate Escape key handler (now handled by focus trap)

**Acceptance Criteria:**
- ✅ Focus moves to sidebar close button when opened
- ✅ Tab cycles within sidebar (doesn't escape to main content)
- ✅ Escape closes sidebar and returns focus to trigger element
- ✅ TryIt button focus restored after sidebar close
- ✅ Works with keyboard only (no mouse)
- ✅ Screen readers announce modal state correctly

**Effort:** 2 hours (actual)

**Dependencies:** None

---

- [x] **P3.3: Keyboard Navigation Enhancements** ✅ COMPLETE
**Status:** ✅ **COMPLETE** (verified 2026-01-25)

**Why:** Power user feature - `t` to toggle terminal. Improves efficiency for keyboard-heavy users.

**Verification:**
- ✅ `t` key handler EXISTS at useKeyboardNavigation.ts:191-197
- ✅ Calls `onToggleTerminal()` callback
- ✅ Prevents modifier key combinations (Ctrl, Meta, Alt)
- ✅ Respects input field focus state

**Acceptance Criteria:**
- ✅ `t` key toggles terminal sidebar open/closed
- ✅ `t` doesn't trigger when focused on input/textarea
- ✅ `t` works on all pages within tool pair
- ✅ Works with Shift+T too

---

- [x] **P3.4: Testing & Documentation** ✅ COMPLETE (2026-01-25)
**Why:** Ensure quality and maintainability. Prevents regressions and helps future contributors.

**Files Created:**
- `packages/web/tests/browser.spec.ts` - Comprehensive Playwright test suite
- `packages/web/playwright.config.ts` - Playwright configuration
- `packages/sandbox-api/README.md` - Updated with multi-environment plugin API docs

**Files Modified:**
- `packages/web/package.json` - Added test scripts (test, test:ui, test:headed)
- `packages/sandbox-api/README.md` - Added "Multi-Environment Plugin API" section

**Changes:**
- Installed `@playwright/test` as dev dependency
- Installed Chromium browser for Playwright
- Created comprehensive test suite covering:
  - Bidirectional comparison (toggle click, persistence, keyboard)
  - Glossary page (search, filter, copy, category tabs)
  - Swipe gesture (mobile bottom sheet, drag down to close)
  - 't' key toggle (keyboard shortcut, modifier key prevention)
  - Step navigation with multi-environment re-init
  - All 17 routes load successfully
  - Progress persistence (localStorage)
  - Responsive design (320px mobile, desktop)
  - Keyboard navigation (Tab, arrows, ?, Esc)
  - Accessibility (skip links, main landmarks, button labels)
- Added multi-environment plugin API documentation:
  - How to add new environments (Dockerfile, registration, build, usage)
  - Environment configuration schema
  - API endpoints (/api/v1/environments, POST /api/v1/sessions)
  - Startup validation behavior
  - Security considerations for custom environments

**Acceptance Criteria:**
- ✅ Direction toggle test verifies preference persists after refresh
- ✅ Glossary search test verifies results filter correctly
- ✅ Swipe gesture test verifies bottom sheet closes on drag down
- ✅ 't' key test verifies terminal toggle functionality
- ✅ Step navigation test verifies re-init triggers on environment change
- ✅ Plugin API documentation explains how to add new environments
- ✅ All test files created with comprehensive coverage

**Effort:** 4 hours (actual)

**Dependencies:** P1.1, P1.2, P2.4 (features must be implemented first)

**Notes:** Tests can be run with:
- `bun run test` - Headless mode
- `bun run test:ui` - Interactive UI mode
- `bun run test:headed` - Visible browser

---

## Dependencies & Task Order

```
P0 (Quick Wins) - Can be done in parallel
└── P0.1: Enhanced TryIt (2h) ✅ COMPLETE [NO DEPENDENCIES]

P1 (High Value) - Mostly independent
├── P1.1: Glossary Page Route (1h) ✅ COMPLETE [NO DEPENDENCIES - QUICKEST WIN]
├── P1.2: Bidirectional Comparison (5h) ✅ COMPLETE [DO AFTER P1.1 so glossary page exists]
└── P1.3: Per-Tool-Pair Docker Images (3h) ✅ COMPLETE [REQUIRED FOR P2]

P2 (Multi-Environment) - Complex, depends on P1.3
├── P2.1: Environment Registry (3h) [depends on P1.3]
├── P2.2: Frontend Config Loading (3h) [can parallel with P2.1]
├── P2.3: Backend Services Extension (5h) [depends on P2.1]
├── P2.4: Frontend Integration (4h) [depends on P2.2, P2.3]
├── P2.5: Multi-Environment Docker Images (3h) [depends on P1.3]
└── P2.6: Startup Validation (1h) [depends on P2.5]

P3 (Polish) - Can be done anytime
├── P3.1: Mobile Swipe Gesture (2h) ✅ ALREADY IMPLEMENTED [NO DEPENDENCIES]
├── P3.2: Focus Management (2h) [NO DEPENDENCIES]
├── P3.3: Keyboard Nav (0.5h) ✅ ALREADY IMPLEMENTED [NO DEPENDENCIES]
└── P3.4: Testing & Documentation (4h) [depends on P1.1, P1.2, P2.4]
```

---

## Quick Start Implementation Path

### ✅ COMPLETE - Phase 1 & 2 (13.5 hours)

**Completed:**
- ✅ P0.1: Enhanced TryIt (2h) - Editable commands, expected output
- ✅ P1.1: Glossary Page (1h) - Route exists with full search/filter
- ✅ P1.2: Direction Toggle (5h) - Full bidirectional support
- ✅ P1.3: Per-Tool-Pair Docker Images (3h) - Base + tool-pair structure
- ✅ P3.1: Swipe Gesture (2h) - Already implemented
- ✅ P3.3: Keyboard Nav (0.5h) - Already implemented

---

### Remaining Implementation (6 hours)

**Phase 3: Multi-Environment** (19 hours) - ✅ COMPLETE
- ✅ P2.1: Environment Registry (3h) - Backend infrastructure
- ✅ P2.2: Config Loading (3h) - Frontend config.yml support
- ✅ P2.3: Backend Services (5h) - Container/Session/WebSocket extensions
- ✅ P2.4: Frontend Integration (4h) - Connect to backend
- ✅ P2.5: Docker Images (3h) - node, python images
- ✅ P2.6: Startup Validation (1h) - Fail fast on missing images

**Phase 4: Polish** (6 hours) - ✅ COMPLETE
- ✅ P3.1: Swipe Gesture (2h) - Already implemented
- ✅ P3.2: Focus Management (2h) - Focus trap with useFocusTrap hook
- ✅ P3.3: Keyboard Nav (0.5h) - Already implemented
- ✅ P3.4: Testing & Docs (4h) - Playwright tests, plugin API docs

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

# Build Docker images
bun run docker:build

# Run sandbox API
bun run --cwd packages/sandbox-api dev
```

---

## Verification Status

### Verified Components (2026-01-25)

| Component | Location | Status | Notes |
|-----------|----------|--------|-------|
| **Content Loading** | `packages/web/lib/content/` | ✅ Complete | MDX parsing, frontmatter validation, 12 step files |
| **ContentService** | `packages/web/services/content.ts` | ✅ Complete | Effect-TS service with caching, loadStep/listStep helpers |
| **SandboxClient** | `packages/web/services/sandbox-client.ts` | ✅ Complete | Session lifecycle, WebSocket support, API key auth |
| **InteractiveTerminal** | `packages/web/components/ui/InteractiveTerminal.tsx` | ✅ Complete | xterm.js, WebSocket, PTY detection, circuit breaker |
| **TerminalContext** | `packages/web/contexts/TerminalContext.tsx` | ✅ Complete | State machine, command queue, session persistence |
| **TerminalSidebar** | `packages/web/components/ui/TerminalSidebar.tsx` | ⚠️ 95% | Missing focus trap (P3.2) |
| **ShrinkingLayout** | `packages/web/components/ui/ShrinkingLayout.tsx` | ✅ Complete | Applies margin-right when sidebar open |
| **TryIt** | `packages/web/components/ui/TryIt.tsx` | ✅ Complete | Editable commands, expected output, Enter key |
| **SideBySide** | `packages/web/components/ui/SideBySide.tsx` | ✅ Complete | Bidirectional support via DirectionContext |
| **GlossaryClient** | `packages/web/components/ui/GlossaryClient.tsx` | ✅ Complete | Search/filter UI, 35 command mappings |
| **Glossary Route** | `packages/web/app/[toolPair]/glossary/page.tsx` | ✅ Complete | Route exists with full functionality |
| **DirectionToggle** | `packages/web/components/ui/DirectionToggle.tsx` | ✅ Complete | Toggle switch with `role="switch"` |
| **PreferencesStore** | `packages/web/core/PreferencesStore.ts` | ✅ Complete | localStorage persistence for direction |
| **useDirection hook** | `packages/web/hooks/useDirection.ts` | ✅ Complete | Direction state management with hydration |
| **DirectionContext** | `packages/web/contexts/DirectionContext.tsx` | ✅ Complete | React Context for direction state |
| **ProgressStore** | `packages/web/core/ProgressStore.ts` | ✅ Complete | localStorage persistence, step completion tracking |
| **ContainerService** | `packages/sandbox-api/src/services/container.ts` | ✅ Complete | Docker lifecycle, gVisor support, security hardening |
| **SessionService** | `packages/sandbox-api/src/services/session.ts` | ✅ Complete | Timeout management, activity tracking, auto-cleanup |
| **WebSocketService** | `packages/sandbox-api/src/services/websocket.ts` | ✅ Complete | PTY proxy, input validation, message size limits |
| **RateLimitService** | `packages/sandbox-api/src/services/rate-limit.ts` | ✅ Complete | Per-IP limits, sliding windows, dev mode bypass |
| **Base Dockerfile** | `packages/sandbox-api/docker/base/Dockerfile` | ✅ Complete | Chainguard wolfi-base, ~150MB |
| **jj-git Dockerfile** | `packages/sandbox-api/docker/tool-pairs/jj-git/Dockerfile` | ✅ Complete | Extends base, git+jj, ~197MB |
| **Environment Registry** | `packages/sandbox-api/src/environments/` | ✅ Complete | bash, node, python configs with Effect-TS Layer |
| **bash Environment** | `packages/sandbox-api/docker/environments/bash/` | ✅ Complete | FROM base, install git+jj |
| **node Environment** | `packages/sandbox-api/docker/environments/node/` | ✅ Complete | FROM bash, install Node.js 20.x |
| **python Environment** | `packages/sandbox-api/docker/environments/python/` | ✅ Complete | FROM bash, install Python 3 |
| **Startup Validation** | `packages/sandbox-api/src/environments/index.ts` | ✅ Complete | validateAllImages() Effect with MissingImagesError |

### Missing Components

All components complete. No missing items.

---

## Implementation Summary

**Completed (29.5 hours):**
- ✅ Enhanced TryIt component (editable commands, expected output)
- ✅ Glossary page route (35 command mappings, search/filter)
- ✅ Bidirectional comparison (DirectionToggle, PreferencesStore, useDirection)
- ✅ Per-tool-pair Docker images (base + tool-pair structure)
- ✅ Mobile swipe gesture (already implemented)
- ✅ 't' key keyboard shortcut (already implemented)
- ✅ P2.1: Environment Registry (3h) - Backend infrastructure
- ✅ P2.2: Frontend Config Loading (3h) - config.yml support
- ✅ P2.3: Backend Services Extension (5h) - Container/Session/WebSocket
- ✅ P2.4: Frontend Integration (4h) - Connect to multi-environment backend
- ✅ P2.5: Multi-Environment Docker Images (3h) - bash, node, python images
- ✅ P2.6: Startup Validation (1h) - validateAllImages() Effect
- ✅ P3.2: Focus Management (2h) - useFocusTrap hook, triggerRef tracking
- ✅ P3.4: Testing & Documentation (4h) - Playwright tests, plugin API docs

**Remaining (0 hours):**
- **All tasks complete**

---

## Key Findings

1. **✅ P0-P1 COMPLETE**: All quick wins and high-value features are implemented (TryIt, Glossary, Bidirectional, Per-tool-pair Docker images).

2. **✅ P3.1 & P3.3 COMPLETE**: Mobile swipe gesture and 't' key toggle already implemented.

3. **✅ P2.1-P2.6 COMPLETE**: Multi-environment system is fully implemented including startup validation.

4. **Backend Architecture is Solid**: All services follow Effect-TS patterns correctly with TaggedClass errors, Layer composition, and proper error handling.

5. **Content System is Complete**: 12 MDX step files exist with proper frontmatter, loading infrastructure works, glossary data is ready.

6. **✅ Multi-Environment System COMPLETE**: All P2 tasks (P2.1-P2.6) are implemented. The system supports bash, node, python environments with:
   - Environment registry for extensible configurations
   - Per-step sandbox configuration via frontmatter and config.yml
   - Init commands for environment setup
   - Startup validation to ensure all Docker images exist

7. **✅ P3.2 COMPLETE**: Focus trap implementation with custom `useFocusTrap` hook and trigger element tracking in TerminalContext.

8. **✅ P3.4 COMPLETE**: Playwright test suite with comprehensive coverage for all new features (bidirectional comparison, glossary, swipe gesture, keyboard navigation, step navigation, accessibility). Multi-environment plugin API documentation added to sandbox-api README.md.

**🎉 ALL IMPLEMENTATION TASKS COMPLETE** - The toolkata project is fully implemented with all P0-P3 tasks complete.

---

## Architectural Notes

### Multi-Environment Design Philosophy

The multi-environment system follows the same architectural patterns as the existing codebase:

1. **Effect-TS for Composition**: Environment registry is an Effect service with proper error handling
2. **Configuration Resolution**: Three-tier fallback (step frontmatter → tool-pair config → global defaults)
3. **Security by Default**: Init commands run silently, no output leaked until completion
4. **Fail Fast**: Server startup validates all images exist before accepting connections
5. **Plugin Architecture**: New environments can be added without modifying core code

### Why This Matters

The multi-environment system transforms toolkata from a "git/jj comparison site" into a "general developer learning platform":

- **Node.js lessons**: Users can learn npm, package.json, TypeScript
- **Python lessons**: Users can learn pip, venv, Django basics
- **Custom environments**: Plugin system allows community contributions
- **Per-step control**: Conceptual lessons can hide the terminal entirely

This is the foundation for scaling beyond jj→git to any tool comparison.
