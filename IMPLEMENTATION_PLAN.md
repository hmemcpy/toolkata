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
| `multi-environment-sandbox.md` | Mostly done | bash/node/python registered; **scala/typescript NOT registered in registry.ts** |
| `cats-effect-zio-comparison.md` | Done | 15-step zio-cats content, ScalaComparisonBlock, Scastie |
| `cats-zio-improvements.md` | Mostly done | Shiki highlighting done; Zionomicon accuracy audit pending |
| `zionomicon-tutorial-update.md` | Mostly done | All 15 steps exist in content repo; accuracy audit against Zionomicon not yet done |
| `effect-zio.md` | Done | 15-step effect-zio content, CrossLanguageBlock |
| `snippet-validation.md` | Done | validate-snippets.ts with Docker, caching |
| `jj-kata.md` | Done | 7 katas in toolkata-content, KataLanding, routes |
| `jj-kata-implementation.md` | Done | KataProgressContext, validation system |
| `admin-dashboard.md` | Done | 8+ admin pages, CMS, metrics, logs, containers |
| `content-cms.md` | Done | FileBrowser, FileEditor, GitHub PR workflow |
| `single-tool-tutorial.md` | Not started | No discriminated union, no tmux content/env |

---

## P0 — Critical Fixes (unblocks existing features)

- [ ] **Register scala and typescript environments in sandbox registry** — `scalaEnvironment` and `typescriptEnvironment` are defined in `builtin.ts` (lines 41-58) but NOT added to `REGISTERED_ENVIRONMENTS` in `registry.ts` (line 15). The import on line 3 only brings in `bashEnvironment, nodeEnvironment, pythonEnvironment`. Fix: (1) Update import in `registry.ts` to also import `scalaEnvironment, typescriptEnvironment` from `./builtin.js`. (2) Add both to the `REGISTERED_ENVIRONMENTS` array. (3) Update the re-export in `index.ts` line 172 to include `scalaEnvironment, typescriptEnvironment`. Impact: `GET /api/v1/environments` will list all 5 environments, `hasEnvironment("scala")` returns true, `validateAllImages()` checks all Docker images at startup. Files: `packages/sandbox-api/src/environments/registry.ts`, `packages/sandbox-api/src/environments/index.ts`

---

## P1 — Single-Tool Tutorial Mode (`single-tool-tutorial.md`)

These tasks add tutorial mode alongside pairing mode, starting with tmux as the first tutorial. Spec requirements R1-R12 are mapped below.

### P1-A: Type System & Schema (must be done first — all other P1 tasks depend on this)

- [ ] **Type system: Add discriminated union to pairings.ts (R1)** — Add `mode: "pairing"` to existing `ToolPairing` interface. Create `SingleToolEntry` interface with `mode: "tutorial"`, `tool: { name, description, color?, icon? }` (no `from`/`to`), and same shared fields (slug, category, steps, estimatedTime, status, tags, language). Export `TutorialEntry = ToolPairing | SingleToolEntry` union type. Add `isPairing(entry): entry is ToolPairing` and `isTutorial(entry): entry is SingleToolEntry` type guards. Add tmux entry to `toolPairings` array (rename to `toolEntries`?) with `mode: "tutorial"`, slug `"tmux"`, category `"Other"`, `steps: 8`, `status: "published"`, `language: "shell"`. Update `isValidPairingSlug()` to accept tutorial slugs too. Update `getPublishedPairings()` and `getPairingsByCategory()` return types to `TutorialEntry[]`. Note: The `toolPairings` array is typed `as const satisfies readonly ToolPairing[]` — this constraint must be relaxed to `readonly TutorialEntry[]` to accept both modes. File: `packages/web/content/pairings.ts`

- [ ] **Frontmatter schema: Add generic commands field (R6)** — Add `commands: z.array(z.string()).optional()` to `stepFrontmatterSchema` for tool-agnostic command lists used by tutorials. Keep `gitCommands`/`jjCommands` untouched for backward compat. File: `packages/web/lib/content/schemas.ts`

- [ ] **SandboxConfig: Expand environment union (R8-partial)** — The `SandboxConfig.environment` type at `packages/web/lib/content/types.ts:22` is a string literal union `"bash" | "node" | "python"`. This must be expanded to include `"tmux"` (and `"scala"` and `"typescript"` which are already defined in sandbox-api but missing from the frontend type). Also expand the identical union in `sandboxConfigSchema` at `packages/web/lib/content/schemas.ts:20` (`z.enum(["bash", "node", "python"])`) and the cast on line 88-89 of `types.ts`. Files: `packages/web/lib/content/types.ts`, `packages/web/lib/content/schemas.ts`

### P1-B: UI Components (depends on P1-A)

- [ ] **LessonCard: Handle tutorial mode (R2)** — Check if entry `isTutorial()`: render just tool name and icon (no "from ← to" arrow display), update aria-label to "Learn {tool.name}". Add tmux icon to `getToolIcon()` — use a terminal icon (e.g., from lucide-react `Terminal` icon or a simple SVG). File: `packages/web/components/ui/LessonCard.tsx`

- [ ] **Overview page: Conditional rendering for tutorials (R3)** — Update `app/[toolPair]/page.tsx`: for tutorials, show "Learn {tool.name}" header instead of "Learn {to.name} if you know {from.name}". Add "Why tmux?" section with 5 features (terminal multiplexing, session persistence, remote workflows, pane/window management, scriptability). Add `tmuxSteps` metadata array (8 steps with titles/descriptions) and `tmuxTimes` map to `search-data.ts` or inline. Update glossary link text to "Cheat Sheet →" for tutorials. Adjust `generateMetadata()` for tutorial mode. Update `generateStaticParams()` to include `{ toolPair: "tmux" }`.

- [ ] **Step page: Generic commands support (R6-partial)** — Update `app/[toolPair]/[step]/page.tsx`: use `frontmatter.commands ?? frontmatter.jjCommands ?? frontmatter.zioCommands ?? []` for step command display in metadata/header. Update `generateMetadata()` to handle tutorials (no "from" tool in title). Update `generateStaticParams()` to include tmux steps 1-8. Ensure MDX rendering works with TryIt components for tmux commands.

- [ ] **CheatSheetEntry type and tmux data (R4, R5)** — Add `CheatSheetEntry` interface to `packages/web/content/glossary/types.ts`: `{ id: string, category: string, command: string, description: string, note?: string }`. Create tmux cheat sheet data file `packages/web/content/glossary/tmux.ts` with categories: SESSIONS, WINDOWS, PANES, NAVIGATION, COPY_MODE, CONFIG. Export `tmuxCheatSheet: readonly CheatSheetEntry[]` with search/filter helpers matching GlossaryEntry pattern.

- [ ] **CheatSheetClientWrapper component (R4)** — Create `packages/web/components/ui/CheatSheetClientWrapper.tsx`: single-column layout (command + description), searchable with category filter tabs, no direction toggle. Similar structure to GlossaryClient but simplified for single-tool reference. Include copy button for commands, category filtering, keyboard-navigable, aria-live search result count. Terminal aesthetic matching existing GlossaryClient styling.

- [ ] **Glossary page: Branch on mode (R4)** — Update `app/[toolPair]/glossary/page.tsx`: import `isPairing` type guard, check mode to render `GlossaryClientWrapper` (existing two-column) vs `CheatSheetClientWrapper` (new single-column). Import tmux cheat sheet data. Update page title/metadata: "tmux Cheat Sheet" for tutorials vs "{from} → {to} Glossary" for pairings. Update `generateStaticParams()` to include `{ toolPair: "tmux" }`.

- [ ] **Search data: Handle tutorials (R10)** — Add tmux steps to `STEPS_BY_PAIRING` in `packages/web/lib/search-data.ts` (8 steps with titles/descriptions). Update `getSearchableSteps()` to handle `SingleToolEntry`: use `entry.tool.name` as `toName`, empty string for `fromName` (tutorials have no source tool). The current code at line 229 accesses `pairing.from.name` which will fail for tutorials — add type guard branch. Update `TerminalSearch.tsx` to not render "← fromName" prefix when `fromName` is empty.

### P1-C: Sandbox Infrastructure (can be done in parallel with P1-B)

- [ ] **Docker environment: tmux Dockerfile (R7)** — Create `packages/sandbox-api/docker/environments/tmux/Dockerfile` extending `toolkata-env:bash` (which already has base security hardening, non-root user, UTF-8). Install tmux via `apk add tmux`. Provide custom `.bashrc` without `stty -echo` (tmux manages its own PTY). Add `entrypoint.sh` matching other environments. Verify tmux works on Chainguard wolfi-base. Note: PID limit of 50 may limit number of concurrent panes — document this.

- [ ] **Environment registration: tmux builtin + registry (R8)** — Add `tmuxEnvironment` config to `packages/sandbox-api/src/environments/builtin.ts`: `{ name: "tmux", dockerImage: "toolkata-env:tmux", defaultTimeout: 120000, defaultInitCommands: [], description: "Bash shell with tmux terminal multiplexer", category: "shell" }`. Add to `builtinEnvironments` array. Add to `REGISTERED_ENVIRONMENTS` in `registry.ts`. Add to re-exports in `index.ts`.

### P1-D: Content (depends on P1-A for schema, can parallel with P1-B/C)

- [ ] **Content: tmux config.yml** — Create `/Users/hmemcpy/git/toolkata-content/tmux/config.yml` with sandbox enabled, environment `"tmux"`, timeout 120s, and init commands (e.g., `tmux -V` to verify installed).

- [ ] **Content: tmux index.mdx** — Create `/Users/hmemcpy/git/toolkata-content/tmux/lessons/index.mdx` with overview frontmatter. Brief intro to tmux, what users will learn (sessions, windows, panes, copy mode, config), prerequisites (basic terminal knowledge).

- [ ] **Content: tmux lessons 01-04 (basics)** — Create 4 MDX files in `/Users/hmemcpy/git/toolkata-content/tmux/lessons/`: `01-step.mdx` (What is tmux? — install, first session, basic orientation), `02-step.mdx` (Sessions — new, list, attach, detach, kill), `03-step.mdx` (Windows — create, navigate, rename, close, list), `04-step.mdx` (Panes — split vertical/horizontal, cycle, zoom, resize). Each uses `<TryIt>` and `<Callout>` components, frontmatter with `commands` array.

- [ ] **Content: tmux lessons 05-08 (advanced)** — Create 4 MDX files: `05-step.mdx` (Key Bindings — prefix key, list bindings, command mode), `06-step.mdx` (Copy Mode — enter, vi/emacs nav, search, select/yank, paste), `07-step.mdx` (Configuration — .tmux.conf, prefix rebinding, options, status bar; `validate={false}` for editor-dependent snippets), `08-step.mdx` (Session Management & Scripting — multiple sessions, switch, send-keys, scripting, session groups).

- [ ] **Content: tmux glossary data** — Create `/Users/hmemcpy/git/toolkata-content/tmux/glossary.ts` with tmux command reference data matching `CheatSheetEntry` format. Categories: SESSIONS, WINDOWS, PANES, NAVIGATION, COPY_MODE, CONFIG. Also create matching file in `packages/web/content/glossary/tmux.ts` (the web repo is currently the source of truth for glossary imports — see Discoveries).

### P1-E: Verification

- [ ] **Verify build passes after tutorial mode changes** — Run `bun run --cwd packages/web build` and fix any type errors. Ensure all 3 existing pairings (jj-git, zio-cats, effect-zio) still work correctly. Verify tmux routes render: `/tmux` (overview), `/tmux/1` through `/tmux/8` (steps), `/tmux/glossary` (cheat sheet).

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
