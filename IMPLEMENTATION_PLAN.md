# Implementation Plan

> **Validation**: `bun run --cwd packages/web build`
> **Last updated**: 2026-02-04

## Spec-to-Implementation Status

| Spec | Status | Notes |
|------|--------|-------|
| `toolkata.md` | Done | Core platform implemented |
| `bidirectional-comparison.md` | Done | DirectionToggle, glossary, useDirection hook |
| `terminal-sidebar.md` | Done | TerminalSidebar, SplitPane, InfoPanel, TryIt |
| `sandbox-integration.md` | Done | TerminalContext, TryIt, gVisor, per-pair Docker |
| `multi-environment-sandbox.md` | Done | All 5 environments (bash/node/python/scala/typescript) registered |
| `cats-effect-zio-comparison.md` | Done | 15-step zio-cats content, ScalaComparisonBlock, Scastie |
| `cats-zio-improvements.md` | Mostly done | Shiki highlighting done; Zionomicon accuracy audit pending |
| `zionomicon-tutorial-update.md` | Mostly done | All 15 steps exist in content repo; accuracy audit against Zionomicon not yet done |
| `effect-zio.md` | Done | 15-step effect-zio content, CrossLanguageBlock |
| `snippet-validation.md` | Done | validate-snippets.ts with Docker, caching |
| `jj-kata.md` | Done | 7 katas in toolkata-content, KataLanding, routes |
| `jj-kata-implementation.md` | Done | KataProgressContext, validation system |
| `admin-dashboard.md` | Done | 8+ admin pages, CMS, metrics, logs, containers |
| `content-cms.md` | Done | FileBrowser, FileEditor, GitHub PR workflow |
| `single-tool-tutorial.md` | In progress | Type system (R1, R6, R8), UI components (R2, R3, R4, R5), glossary page branching done; remaining: search data (R10), Docker env (R7, R8), content (8 lessons) |

---

## P0 — Critical Fixes (unblocks existing features)

- [x] Completed: **Register scala and typescript environments in sandbox registry** — Updated `registry.ts` to import and register `scalaEnvironment, typescriptEnvironment`, updated `index.ts` re-export. Impact: `GET /api/v1/environments` now lists all 5 environments, `hasEnvironment("scala")` returns true, `validateAllImages()` checks all Docker images at startup.

---

## P1 — Single-Tool Tutorial Mode (`single-tool-tutorial.md`)

These tasks add tutorial mode alongside pairing mode, starting with tmux as the first tutorial. Spec requirements R1-R12 are mapped below.

### P1-A: Type System & Schema (must be done first — all other P1 tasks depend on this)

- [x] Completed: **Type system: Add discriminated union to pairings.ts (R1)** — Added `mode: "pairing"` to existing `ToolPairing` interface. Created `SingleToolEntry` interface with `mode: "tutorial"`, `tool: { name, description, color?, icon? }`, and shared fields. Exported `TutorialEntry = ToolPairing | SingleToolEntry` union type. Added `isPairing(entry): entry is ToolPairing` and `isTutorial(entry): entry is SingleToolEntry` type guards. Added tmux entry to new `toolEntries` array with `mode: "tutorial"`, slug `"tmux"`, category `"Other"`, `steps: 8`, `status: "published"`, `language: "shell"`. Added `getEntry()`, `getPublishedEntries()`, `getEntriesByCategory()`, `isValidEntrySlug()` functions. Kept `toolPairings` export for backward compat (filters `toolEntries` to `ToolPairing[]`). Fixed `search-data.ts` exactOptionalPropertyTypes issue with optional `tags` property. Files: `packages/web/content/pairings.ts`, `packages/web/lib/search-data.ts`

- [x] Completed: **Frontmatter schema: Add generic commands field (R6)** — Added `commands: z.array(z.string()).optional()` to `stepFrontmatterSchema` for tool-agnostic command lists used by tutorials. Also added `zioCommands` for consistency with existing code. Kept `gitCommands`/`jjCommands` untouched for backward compat. Files: `packages/web/lib/content/schemas.ts`

- [x] Completed: **SandboxConfig: Expand environment union (R8-partial)** — Expanded `SandboxConfig.environment` type in `packages/web/lib/content/types.ts:22` from `"bash" | "node" | "python"` to include `"scala"`, `"typescript"`, `"tmux"`. Also expanded the identical union in `sandboxConfigSchema` at `packages/web/lib/content/schemas.ts:20` and updated the type cast in `resolveSandboxConfig()`. Also updated `InteractiveTerminal.tsx` component's `SandboxConfig` interface to match. Files: `packages/web/lib/content/types.ts`, `packages/web/lib/content/schemas.ts`, `packages/web/components/ui/InteractiveTerminal.tsx`

### P1-B: UI Components (depends on P1-A)

- [x] Completed: **LessonCard: Handle tutorial mode (R2)** — Updated `LessonCardProps` to accept `TutorialEntry` (union of `ToolPairing | SingleToolEntry`). Added `TerminalIcon` SVG component. Updated `getToolIcon()` to handle "terminal" icon for tmux. Used `isPairing()` type guard to conditionally render tool names with arrow (pairings) vs just tool name (tutorials). Updated aria-label to "Learn {tool.name}" for tutorials. Also updated `app/page.tsx` to use `getEntriesByCategory()` instead of `getPairingsByCategory()` and pass `entry` prop. Files: `packages/web/components/ui/LessonCard.tsx`, `packages/web/app/page.tsx`

- [x] Completed: **Overview page: Conditional rendering for tutorials (R3)** — Updated `app/[toolPair]/page.tsx`: Changed imports from `getPairing, isValidPairingSlug` to `getEntry, isPairing, isValidEntrySlug`. Updated `generateStaticParams()` to include `{ toolPair: "tmux" }`. Updated `generateMetadata()` to branch on `isPairing(entry)` — tutorials show "Learn {tool.name}" title and "Learn {tool.name}. {estimatedTime} tutorial." description. Changed main function body to use `getEntry()` instead of `getPairing()`, `isValidEntrySlug()` instead of `isValidPairingSlug()`. Updated header to show "Learn {tool.name}" for tutorials vs "{to.name} ← {from.name}" for pairings. Updated documentation link to handle both modes. Added "Why tmux?" section with 5 features. Added `tmuxSteps` metadata array (8 steps with titles/descriptions) and `tmuxTimes` map. Updated `steps` selection logic to include tmux branch. Updated `estimatedTimes` selection to include tmux branch. Updated glossary link to show "[Cheat Sheet →]" for tutorials vs "[Glossary →]" for pairings. Updated `ProgressCard` to use `entry.steps`. Updated `OverviewPageClientWrapper` to use `entry.steps`. Fixed default jj-git case to check `isPairing(entry)` before accessing `entry.to.name` and `entry.from.name`. File: `packages/web/app/[toolPair]/page.tsx`

- [x] Completed: **Step page: Generic commands support (R6-partial)** — Updated `app/[toolPair]/[step]/page.tsx`: Changed imports from `getPairing, isValidPairingSlug` to `getEntry, isPairing, isValidEntrySlug`. Updated `generateStaticParams()` to include tmux with 8 steps. Updated `generateMetadata()` to branch on `isPairing(entry)` — tutorials show "Step N | Learn {tool.name}" title and "Learn {tool.name}. {estimatedTime} tutorial." description, while pairings show "Step N | {to.name} ← {from.name}". Changed main function body to use `getEntry()` instead of `getPairing()`, `isValidEntrySlug()` instead of `isValidPairingSlug()`. Used generic commands fallback: `frontmatter.commands ?? frontmatter.jjCommands ?? frontmatter.zioCommands ?? []` for stepCommands. MDX rendering works with TryIt components via existing mdxComponents. Build output confirms tmux step pages `/tmux/1` through `/tmux/8` are now statically generated. File: `packages/web/app/[toolPair]/[step]/page.tsx`

- [x] Completed: **CheatSheetEntry type and tmux data (R4, R5)** — Added `CheatSheetEntry` interface to `packages/web/content/glossary/types.ts`: `{ id, category, command, description, note? }`. Created tmux cheat sheet data file `packages/web/content/glossary/tmux.ts` with 6 categories (SESSIONS: 7 entries, WINDOWS: 8 entries, PANES: 10 entries, NAVIGATION: 5 entries, COPY_MODE: 8 entries, CONFIG: 8 entries). Export `tmuxCheatSheet: readonly CheatSheetEntry[]` with search/filter helpers matching GlossaryEntry pattern. Files: `packages/web/content/glossary/types.ts`, `packages/web/content/glossary/tmux.ts`

- [x] Completed: **CheatSheetClientWrapper component (R4)** — Created `packages/web/components/ui/CheatSheetClient.tsx` (single-column searchable table with command + description, category filter tabs, copy button, aria-live results) and `CheatSheetClientWrapper.tsx` (wrapper with tagline). Terminal aesthetic matches existing GlossaryClient styling. No direction toggle since single-tool. Files: `packages/web/components/ui/CheatSheetClient.tsx`, `packages/web/components/ui/CheatSheetClientWrapper.tsx`

- [x] Completed: **Glossary page: Branch on mode (R4)** — Updated `app/[toolPair]/glossary/page.tsx`: Changed imports from `getPairing, isValidPairingSlug` to `getEntry, isPairing, isValidEntrySlug`. Updated `generateStaticParams()` to include `{ toolPair: "tmux" }`. Updated `generateMetadata()` to branch on `isPairing(entry)` — tutorials show "{tool.name} Cheat Sheet" title/description, pairings show "{to.name} ← {from.name} Glossary". Main function branches: pairings get `GlossaryClientWrapper` with two-column comparison, tutorials get `CheatSheetClientWrapper` with single-column layout. Imports tmux cheat sheet data. Build confirms `/tmux/glossary` route is statically generated. File: `packages/web/app/[toolPair]/glossary/page.tsx`

- [x] Completed: **Search data: Handle tutorials (R10)** — Added tmux steps to `STEPS_BY_PAIRING` in `packages/web/lib/search-data.ts` (8 steps with titles/descriptions). Updated imports to use `getPublishedEntries, isPairing, isTutorial` from pairings.ts. Updated `getSearchableSteps()` to handle `SingleToolEntry` with type guard branch: for pairings, use `entry.to.name`/`entry.from.name`; for tutorials, use `entry.tool.name` as `toName`, empty string for `fromName`. Also updated `getSearchableStepsForPairing()` with same logic. Updated `TerminalSearch.tsx` to conditionally render: `{result.fromName ? \`${result.toName} ← ${result.fromName}\` : result.toName}` so tutorials show just the tool name without arrow prefix. Build passes with tmux routes statically generated. Files: `packages/web/lib/search-data.ts`, `packages/web/components/ui/TerminalSearch.tsx`

### P1-C: Sandbox Infrastructure (can be done in parallel with P1-B)

- [x] Completed: **Docker environment: tmux Dockerfile (R7)** — Created `packages/sandbox-api/docker/environments/tmux/Dockerfile` extending `toolkata-env:bash`. Installed tmux via `apk add tmux`. Provided custom `.bashrc` without `stty -echo` (tmux manages its own PTY). Added `entrypoint.sh` matching other environments. Also updated `scripts/docker-build-all.sh` to build tmux image and run 5 tests (tmux availability, session management, git/jj still work, non-root user, security hardening). Files: `packages/sandbox-api/docker/environments/tmux/Dockerfile`, `packages/sandbox-api/docker/environments/tmux/entrypoint.sh`, `packages/sandbox-api/scripts/docker-build-all.sh`

- [x] Completed: **Environment registration: tmux builtin + registry (R8)** — Added `tmuxEnvironment` config to `packages/sandbox-api/src/environments/builtin.ts`: `{ name: "tmux", dockerImage: "toolkata-env:tmux", defaultTimeout: 120000, defaultInitCommands: [], description: "Bash shell with tmux terminal multiplexer", category: "shell" }`. Added to `builtinEnvironments` array. Added to `REGISTERED_ENVIRONMENTS` in `registry.ts`. Added to re-exports in `index.ts`. Files: `packages/sandbox-api/src/environments/builtin.ts`, `packages/sandbox-api/src/environments/registry.ts`, `packages/sandbox-api/src/environments/index.ts`

### P1-D: Content (depends on P1-A for schema, can parallel with P1-B/C)

- [x] Completed: **Content: tmux config.yml** — Created `/Users/hmemcpy/git/toolkata-content/tmux/config.yml` with sandbox enabled, environment `"tmux"`, timeout 120s, and init commands (`tmux -V` to verify installed).

- [x] Completed: **Content: tmux index.mdx** — Created `/Users/hmemcpy/git/toolkata-content/tmux/lessons/index.mdx` with overview frontmatter. Brief intro to tmux, what users will learn (sessions, windows, panes, copy mode, config), prerequisites (basic terminal knowledge).

- [x] Completed: **Content: tmux lessons 01-04 (basics)** — Created 4 MDX files in `/Users/hmemcpy/git/toolkata-content/tmux/lessons/`: `01-step.mdx` (What is tmux? — install, first session, basic orientation), `02-step.mdx` (Sessions — new, list, attach, detach, kill), `03-step.mdx` (Windows — create, navigate, rename, close, list), `04-step.mdx` (Panes — split vertical/horizontal, cycle, zoom, resize). Each uses `<TryIt>` and `<Callout>` components, frontmatter with `commands` array.

- [x] Completed: **Content: tmux lessons 05-08 (advanced)** — Created 4 MDX files: `05-step.mdx` (Key Bindings — prefix key, list bindings, command mode), `06-step.mdx` (Copy Mode — enter, vi/emacs nav, search, select/yank, paste), `07-step.mdx` (Configuration — .tmux.conf, prefix rebinding, options, status bar; `validate={false}` for editor-dependent snippets), `08-step.mdx` (Session Management & Scripting — multiple sessions, switch, send-keys, scripting, session groups).

- [x] Completed: **Content: tmux glossary data** — Created `/Users/hmemcpy/git/toolkata-content/tmux/glossary.ts` with tmux command reference data matching `CheatSheetEntry` format. Categories: SESSIONS (7 entries), WINDOWS (8 entries), PANES (10 entries), NAVIGATION (5 entries), COPY_MODE (8 entries), CONFIG (8 entries). The web repo already had `packages/web/content/glossary/tmux.ts` as source of truth — created matching file in content repo for R12 migration.

### P1-E: Verification

- [x] Completed: **Verify build passes after tutorial mode changes** — Ran `bun run --cwd packages/web build` — build passed successfully. All 3 existing pairings (jj-git: 12 steps, zio-cats: 15 steps, effect-zio: 15 steps) still work correctly. Tmux routes are statically generated: `/tmux` (overview), `/tmux/1` through `/tmux/8` (steps), `/tmux/glossary` (cheat sheet). The `generateStaticParams()` in step page correctly includes all 4 entries. No type errors.

---

## P2 — Zionomicon Tutorial Update (`zionomicon-tutorial-update.md`)

Audit and improve zio-cats content accuracy using Zionomicon as authoritative reference. Steps 11-15 already exist with substantial content (308-612 lines each) — the work is auditing and correcting, not creating from scratch.

- [ ] **Audit zio-cats steps 1-10 against Zionomicon** — Read Zionomicon ePub (`/Users/hmemcpy/Downloads/Zionomicon - 8.28.2025.ePub`) and compare each of the 10 existing steps for accuracy. Check: ZIO type signatures, effect constructors, error handling operators, resource management patterns, ZLayer patterns, Fiber model, ZStream API, application structure. Document inaccuracies and needed updates. Reference: `zionomicon-tutorial-update.md` R1/R2 and chapter mapping. Already fixed: Step 1 (`ZIO.attempt(42)` → proper side-effecting example), Step 2 (`IO[Option[Nothing], Int]` → `IO[None.type, Int]`).

- [ ] **Update zio-cats steps 1-10 with Zionomicon-accurate content** — Fix ZIO type signatures, API usage patterns, and explanations per audit findings. Files: `/Users/hmemcpy/git/toolkata-content/zio-cats/lessons/01-step.mdx` through `10-step.mdx`.

- [ ] **Audit zio-cats steps 11-15 against Zionomicon** — Steps 11-15 already exist with content (STM: 308 lines, Concurrent Structures: 307 lines, Configuration: 398 lines, HTTP: 612 lines, Database: 452 lines). Audit these against Zionomicon chapters 23-24 (STM), 11-15 (Concurrent Structures), 22 (Configuration). HTTP and Database steps cover ZIO HTTP/http4s and ZIO JDBC/Doobie respectively — verify accuracy against current library APIs. Check that `validate={false}` is set on snippets using external libraries not in sandbox (ciris, doobie, http4s, skunk).

- [ ] **Update zio-cats steps 11-15 per audit findings** — Fix any inaccuracies found in audit. Ensure ScalaComparisonBlock code uses correct `|` prefix format for indentation. Verify `validate={false}` is properly set on snippets with external dependencies.

- [ ] **Update zio-cats glossary if needed** — Check if glossary entries in `packages/web/content/glossary/zio-cats.ts` already cover STM, concurrent structures, config, HTTP, and database categories. The file has 44 entries across 11 categories including STM (6), CONFIG (7), HTTP (7), DATABASE (6) — likely already comprehensive. Verify accuracy against Zionomicon and update if needed.

---

## Discoveries

### Already Implemented (no action needed)
- **Bidirectional comparison**: DirectionToggle, useDirection hook, GlossaryClient direction support all working
- **Terminal sidebar**: TerminalSidebar with SplitPane, InfoPanel, resize, collapse, lazy-loaded InteractiveTerminal
- **Sandbox integration**: TerminalContext, TryIt with editable commands, per-tool-pair Docker images, gVisor support
- **Multi-environment sandbox**: bash/node/python environments with Docker images and build scripts (scala/typescript images exist but aren't registered — see P0)
- **Cats Effect ↔ ZIO comparison**: 15 steps with content, ScalaComparisonBlock with Shiki, Scastie embeds
- **Effect ↔ ZIO tutorial**: 15 steps, CrossLanguageBlock, dual-language support
- **Snippet validation**: Full CLI with Docker execution, caching, multi-environment
- **JJ Kata**: 7 katas in content repo, KataLanding page, KataProgressContext, validation
- **Admin dashboard**: 8+ pages including CMS, metrics, logs, containers, rate limits
- **Content CMS**: FileBrowser, FileEditor, MDXPreview, GitHub PR workflow
- **zio-cats steps 11-15**: Already written with substantial content (308-612 lines each), not stubs

### Critical Gap Found
- **Scala and TypeScript environments not registered** (P0): `scalaEnvironment` and `typescriptEnvironment` exist in `builtin.ts` (lines 41-58) but are missing from `REGISTERED_ENVIRONMENTS` in `registry.ts` (line 15). The import on line 3 only brings in `bashEnvironment, nodeEnvironment, pythonEnvironment`. The re-exports in `index.ts` (line 172) also only include those three. This means:
  - `GET /api/v1/environments` doesn't list scala or typescript
  - `hasEnvironment("scala")` returns `false`
  - `validateAllImages()` doesn't check their Docker images at startup
  - Session creation for these environments may fail silently

### Frontend SandboxConfig Type Mismatch
- **Environment union out of sync**: `SandboxConfig.environment` in `packages/web/lib/content/types.ts:22` only allows `"bash" | "node" | "python"`, but the sandbox-api already supports 5 environments (bash, node, python, scala, typescript). The Zod schema at `schemas.ts:20` has the same restriction. This should be expanded in P1-A task "SandboxConfig: Expand environment union" to at minimum include `"scala"`, `"typescript"`, and `"tmux"`.

### Glossary Data Duplication
- Glossary `.ts` files exist in **both** `packages/web/content/glossary/` and `toolkata-content/{pairing}/glossary.ts` — they are identical copies. However, the web app **only imports from the web repo** (`app/[toolPair]/glossary/page.tsx` uses relative imports to `content/glossary/`). The copies in `toolkata-content` are not consumed by anything and their imports (`from "./types"`) would fail since `types.ts` doesn't exist there.
- **R12 of single-tool-tutorial.md** calls for migrating glossary to the content repo, but this is a separate concern. For now, tmux glossary data should be added to the web repo (`packages/web/content/glossary/tmux.ts`) to match current architecture.

### Search Data Requires Manual Sync
- `STEPS_BY_PAIRING` in `search-data.ts` is a hardcoded object with step titles/descriptions for all three pairings. When adding tmux, a new `"tmux"` key must be added. The `getSearchableSteps()` function accesses `pairing.from.name` at line 229 — this will throw for `SingleToolEntry` which has no `from` field, requiring a type guard branch.

### Out of Scope (specs exist but not prioritized)
- **cats-zio-improvements.md** bidirectional UX prototype options — The spec proposes 4 UI approaches for bidirectional tutorials; current DirectionToggle already covers the core use case
- **jj-kata-implementation.md** leaderboard — Marked as future work in the spec itself
- **admin-dashboard.md** Redis migration — Current in-memory rate limiting works; Redis is an optimization
- **Glossary migration to content repo (R12)** — Prerequisite for clean architecture but not blocking any feature; current dual-copy approach works
