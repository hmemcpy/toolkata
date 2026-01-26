# Implementation Plan: Snippet Validation System

> **Scope**: Multiple related files | **Risk**: Aggressive | **Validation**: `bun run build && bun run typecheck && bun run lint && bun test`

## Summary

Build a headless snippet validation system that extracts code from MDX, executes against sandbox environments, and fails the build on errors. Priority: get jj-git working end-to-end first, then expand to Scala/TypeScript. Uses existing SandboxClient infrastructure with new silent init command support.

---

## Gap Analysis (Verified 2026-01-26)

### What Already Exists

**Multi-Environment Docker Infrastructure (complete):**
- `packages/sandbox-api/src/environments/` — Complete environment registry with Effect-TS service
- `packages/sandbox-api/src/environments/builtin.ts` — 3 environments registered (bash, node, python)
- `packages/sandbox-api/docker/environments/` — Dockerfiles for bash, node, python (verified: 3 envs with entrypoints)
- `packages/sandbox-api/scripts/docker-build-all.sh` — Multi-environment build with automated tests

**WebSocket Init Commands (partial):**
- `websocket.ts` lines 291-329: `executeInitCommands()` method exists with timeout support
- Interface `InitCommands` at lines 33-38 has `type`, `commands`, `timeout` but **NO `silent` field**
- Runs commands via PTY `terminal.write()`
- Has 200ms delays per command, configurable timeout (default 30s)
- **GAP 1:** Output IS sent to client (not silent) — PTY data callback at lines 207-211 always sends to socket
- **GAP 2:** `initComplete` message never sent — client expects it but server doesn't send it

**Client `initComplete` Handler (complete):**
- `InteractiveTerminal.tsx`: `WsInitCompleteMessage` interface defined
- Handler calls `onInitComplete?.()` callback when message received
- **Working:** Client side is ready, just needs server to send the message

**Content Infrastructure (complete — needs `validation` field added):**
- `packages/web/lib/content/schemas.ts` — Zod frontmatter validation with `sandboxConfigSchema`
- Schema supports `sandbox: { enabled, environment, timeout, init }` but NOT `validation:` section
- Config files exist at `packages/web/content/comparisons/{pairing}/config.yml`
- All 3 config.yml files exist (jj-git has `defaults.sandbox` section; need `validation:` sections)

**TryIt Component (complete — needs `setup` prop added):**
- `packages/web/components/ui/TryIt.tsx` — Working component with `command`, `description`, `expectedOutput`, `editable` props
- **Missing:** `setup` prop for per-snippet validation override

**Existing CI (partial):**
- `.github/workflows/ci.yml` exists — general CI workflow
- **Missing:** Dedicated snippet validation workflow

### What Does NOT Exist

**Validation Scripts (0/6 created):**
- `packages/web/scripts/validate-snippets.ts` — CLI entry point
- `packages/web/scripts/snippet-extractor.ts` — MDX parsing
- `packages/web/scripts/headless-validator.ts` — Sandbox execution
- `packages/web/scripts/config-resolver.ts` — Config merging
- `packages/web/scripts/sandbox-manager.ts` — Auto-start sandbox-api
- `packages/web/scripts/validation-cache.ts` — Step-level caching

**Note:** `packages/web/scripts/` directory does not exist yet.

**New Docker Environments (0/2):**
- `packages/sandbox-api/docker/environments/scala/Dockerfile`
- `packages/sandbox-api/docker/environments/typescript/Dockerfile`

**Component Props (0/4 complete):**
- `ScalaComparisonBlock.tsx` — needs `validate`, `extraImports` props
- `CrossLanguageBlock.tsx` — needs `validate`, `extraImports` props
- `SideBySide.tsx` — needs `validate` prop
- `TryIt.tsx` — needs `setup` prop

**Config Updates (0/3):**
- `jj-git/config.yml` — needs `validation:` section with shell prelude (currently only has `defaults.sandbox`)
- `zio-cats/config.yml` — needs `validation:` section with Scala imports/wrapper
- `effect-zio/config.yml` — needs `validation:` + `secondary:` sections

**Other:**
- `.github/workflows/validate-snippets.yml` — CI workflow (separate from existing ci.yml)
- `.validation-cache/` directory and gitignore entry
- `packages/web/lib/content/schemas.ts` — add `validation` field to frontmatter schema

---

## Priority Levels

- **P0**: Core functionality — jj-git E2E validation working
- **P1**: Production readiness — caching, build integration, CI
- **P2**: Extended coverage — Scala/TypeScript environments, component props

---

## P0: Core Snippet Validation (jj-git E2E)

### P0.1: Silent Init Commands in Sandbox API

- [x] **Add `silent` flag to InitCommands interface** — Update `packages/sandbox-api/src/services/websocket.ts` line 33-38 to add `readonly silent?: boolean` field to `InitCommands` interface
- [x] **Implement output suppression in executeInitCommands** — Added `suppressionState` Map to track per-session output suppression. When `silent: true`, the PTY data callback skips sending to socket. Cleanup on connection close.
- [x] **Add `initComplete` response message** — After executeInitCommands completes, sends `{ type: "initComplete", success: boolean, error?: string }`. Also sends initComplete for empty commands.
- [x] **Add init message handler in routes** — Added handler for `message.type === "init"` in `packages/sandbox-api/src/routes/websocket.ts` that calls `executeInitCommands` with `silent` flag
- [x] **Test silent init manually** — Created `packages/sandbox-api/scripts/test-silent-init.ts` test script. Run with `bun run --cwd packages/sandbox-api test:silent-init` (requires sandbox-api running). Tests both silent and non-silent init commands, verifies initComplete received and output suppression.

### P0.2: Sandbox Manager (Auto-start)

- [x] **Create scripts directory** — `packages/web/scripts/` directory already exists
- [x] **Create sandbox-manager.ts** — New file `packages/web/scripts/sandbox-manager.ts` with `ensureSandboxRunning()` function
- [x] **Implement health check** — Uses `/health` endpoint (not `/api/v1/status`) with 2s timeout
- [x] **Implement spawn logic** — `Bun.spawn()` for `bun run dev` in sandbox-api directory, poll health until ready (30s timeout, 500ms interval)
- [x] **Implement cleanup function** — Kill child process, await `.exited` promise
- [x] **Support environment variable** — `SANDBOX_API_URL` override for CI/custom setups

### P0.3: Snippet Extraction (jj-git)

- [x] **Create snippet-extractor.ts** — New file `packages/web/scripts/snippet-extractor.ts`
- [x] **Implement MDX file discovery** — `discoverMdxFiles()` using glob, filters out index.mdx
- [x] **Extract SideBySide commands** — `extractSideBySideSnippets()` with `fromCommands` and `toCommands` arrays
- [x] **Extract TryIt commands** — `extractTryItSnippets()` parses `command` prop
- [x] **Extract markdown code blocks** — `extractCodeBlocks()` for ```bash and ```shell blocks
- [x] **Implement normalizeCode** — Strips `|` prefix (stripMargin format) from code
- [x] **Output ExtractedSnippet interface** — Complete interface with file, toolPair, step, lineStart, language, source, code, prop?, validate?
- [x] **Additional: Extract ScalaComparisonBlock** — `extractScalaComparisonBlocks()` for zioCode/catsEffectCode (P2 prep)
- [x] **Additional: Extract CrossLanguageBlock** — `extractCrossLanguageBlocks()` for zioCode/effectCode (P2 prep)
- [x] **Additional: groupSnippetsByStep utility** — Groups snippets by step number for session reuse
- [x] **Additional: isPseudoCode utility** — Detects pseudo-code patterns (???, ..., comments-only)

### P0.4: Config Resolution

- [ ] **Create config-resolver.ts** — New file `packages/web/scripts/config-resolver.ts`
- [ ] **Load pairing config.yml** — Parse `content/comparisons/{pairing}/config.yml` for `validation:` section
- [ ] **Parse step frontmatter** — Extract `validation:` section from MDX frontmatter using gray-matter
- [ ] **Merge config hierarchy** — Pairing prelude → Step → Component: imports concatenate, setup overrides

### P0.5: Headless Validator (jj-git)

- [ ] **Create headless-validator.ts** — New file `packages/web/scripts/headless-validator.ts`
- [ ] **Implement session creation** — HTTP POST to create session for tool pair, extract sessionId
- [ ] **Implement WebSocket connection** — Connect to session WebSocket URL, set up message handlers
- [ ] **Implement command execution** — Send command, collect output until shell prompt returns
- [ ] **Implement prompt detection** — Wait for `$ ` to appear after command output
- [ ] **Implement error detection for shell** — Check for `error:`, `fatal:`, `usage:` patterns in output
- [ ] **Implement session reuse per step** — Group snippets by step, single session per step
- [ ] **Implement cleanup** — HTTP DELETE to destroy session after step completes

### P0.6: CLI Entry Point

- [ ] **Create validate-snippets.ts** — New file `packages/web/scripts/validate-snippets.ts`
- [ ] **Implement CLI argument parsing** — `--strict`, `--tool-pair`, `--step`, `--verbose`, `--help`
- [ ] **Orchestrate validation flow** — Sandbox manager → Extract → Resolve config → Validate → Report
- [ ] **Implement console reporter** — Per-step pass/fail with snippet counts, summary, failure details with file:line
- [ ] **Exit with code 1 on failures** — For CI integration (`--strict` mode)

### P0.7: Validation Config for jj-git

- [ ] **Update jj-git config.yml** — Add `validation:` section with shell setup commands (git init, config user.email/name)
- [ ] **Add validation schema to stepFrontmatterSchema** — Update `packages/web/lib/content/schemas.ts` with optional `validation` field
- [ ] **Test end-to-end jj-git validation** — Run `bun run scripts/validate-snippets.ts --tool-pair jj-git`
- [ ] **Fix any failing snippets** — Update MDX content or config as needed to pass validation

---

## P1: Production Readiness

### P1.1: Step-Level Caching

- [ ] **Create validation-cache.ts** — New file `packages/web/scripts/validation-cache.ts`
- [ ] **Implement step hash computation** — SHA256 of (config.yml content + step MDX content)
- [ ] **Implement cache storage** — JSON file per step in `.validation-cache/` directory
- [ ] **Implement cache lookup** — Compare hash, skip validation if match, return cached result
- [ ] **Add `--no-cache` flag** — Force re-validation ignoring cache

### P1.2: Build Integration

- [ ] **Add validate:snippets script** — Update `packages/web/package.json` with `"validate:snippets": "bun run scripts/validate-snippets.ts"`
- [ ] **Add prebuild hook** — Update package.json with `"prebuild": "bun run validate:snippets --strict"`
- [ ] **Add .validation-cache to .gitignore** — Prevent cache from being committed
- [ ] **Test full build** — Run `bun run build`, verify validation runs first

### P1.3: CI Integration

- [ ] **Create GitHub Actions workflow** — `.github/workflows/validate-snippets.yml` triggered on content changes
- [ ] **Configure sandbox-api in CI** — Build Docker image, start container in workflow
- [ ] **Add caching for validation results** — GitHub Actions cache for `.validation-cache/` directory
- [ ] **Test PR validation** — Create test PR with content change, verify workflow runs

---

## P2: Extended Coverage

### P2.1: Scala Environment (zio-cats)

- [ ] **Create Dockerfile for Scala** — `packages/sandbox-api/docker/environments/scala/Dockerfile` with Eclipse Temurin JDK 21 + scala-cli
- [ ] **Pre-cache dependencies** — Add ZIO and Cats Effect dependencies to Docker image
- [ ] **Create entrypoint.sh for Scala** — Standard entrypoint matching other environments
- [ ] **Register scala environment** — Update `packages/sandbox-api/src/environments/builtin.ts`
- [ ] **Update docker-build-all.sh** — Add scala environment to build script
- [ ] **Extend snippet-extractor for ScalaComparisonBlock** — Extract `zioCode`, `catsEffectCode` props
- [ ] **Implement Scala validation logic** — Write snippet to file, run `scala-cli compile`, check exit code
- [ ] **Add zio-cats config.yml validation section** — Imports prelude for ZIO and Cats Effect, wrapper template
- [ ] **Test zio-cats validation** — Run full validation, fix any issues

### P2.2: TypeScript Environment (effect-zio)

- [ ] **Create Dockerfile for TypeScript** — `packages/sandbox-api/docker/environments/typescript/Dockerfile` with Node 22 + tsx + typescript
- [ ] **Pre-install effect package** — Add effect to node_modules in Docker image
- [ ] **Create entrypoint.sh for TypeScript** — Standard entrypoint matching other environments
- [ ] **Register typescript environment** — Update `packages/sandbox-api/src/environments/builtin.ts`
- [ ] **Update docker-build-all.sh** — Add typescript environment to build script
- [ ] **Extend snippet-extractor for CrossLanguageBlock** — Extract `zioCode`, `effectCode` props
- [ ] **Implement TypeScript validation logic** — Write snippet to file, run `tsc --noEmit`, check exit code
- [ ] **Add effect-zio config.yml validation section** — Imports prelude for Effect, secondary section for Scala
- [ ] **Test effect-zio validation** — Run full validation, fix any issues

### P2.3: Component Props Support

- [ ] **Add validate prop to ScalaComparisonBlock** — Boolean prop, skip validation when `validate={false}`
- [ ] **Add validate prop to CrossLanguageBlock** — Boolean prop, skip validation when `validate={false}`
- [ ] **Add validate prop to SideBySide** — Boolean prop, skip validation when `validate={false}`
- [ ] **Add setup prop to TryIt** — String array prop to override prelude setup for specific command
- [ ] **Add extraImports prop to ScalaComparisonBlock** — String array prop to extend prelude imports
- [ ] **Add extraImports prop to CrossLanguageBlock** — String array prop to extend prelude imports
- [ ] **Update snippet-extractor** — Parse validate and setup/extraImports props from component JSX

---

## Task Count Summary

| Priority | Phase | Tasks |
|----------|-------|-------|
| P0 | Silent Init Commands | 4 |
| P0 | Sandbox Manager | 6 |
| P0 | Snippet Extraction | 7 |
| P0 | Config Resolution | 4 |
| P0 | Headless Validator | 8 |
| P0 | CLI Entry Point | 5 |
| P0 | jj-git Config | 4 |
| **P0 Total** | | **38** |
| P1 | Caching | 5 |
| P1 | Build Integration | 4 |
| P1 | CI Integration | 4 |
| **P1 Total** | | **13** |
| P2 | Scala Environment | 9 |
| P2 | TypeScript Environment | 9 |
| P2 | Component Props | 7 |
| **P2 Total** | | **25** |
| **Grand Total** | | **76** |

---

## Dependencies Graph

```
P0.1 (Silent Init) ─────────────────────┐
                                        │
P0.2 (Sandbox Manager) ─────────────────┼──► P0.5 (Validator) ──► P0.6 (CLI)
                                        │          │
P0.3 (Extraction) ──────────────────────┤          │
                                        │          │
P0.4 (Config) ──────────────────────────┘          │
                                                   │
                        P0.7 (jj-git Config) ◄─────┘
                                  │
                                  ▼
                        P1.1 (Caching) ──► P1.2 (Build) ──► P1.3 (CI)
                                                   │
                        P2.1 (Scala) ◄─────────────┼───────► P2.2 (TypeScript)
                                                   │
                        P2.3 (Component Props) ◄───┘
```

**Critical Path**: P0.1 + P0.2 + P0.3 + P0.4 → P0.5 → P0.6 → P0.7 (jj-git working E2E)

---

## Commands

```bash
# Development
cd packages/sandbox-api && bun run dev  # Start sandbox API
cd packages/web && bun run dev          # Start web dev server

# Validation (after implementation)
bun run --cwd packages/web scripts/validate-snippets.ts --tool-pair jj-git
bun run --cwd packages/web scripts/validate-snippets.ts --strict
bun run --cwd packages/web scripts/validate-snippets.ts --verbose

# Full build with validation
bun run --cwd packages/web build

# Tests
bun run test
```

---

## Reference Files

| Purpose | File Path |
|---------|-----------|
| WebSocket service | `packages/sandbox-api/src/services/websocket.ts` |
| SandboxClient | `packages/web/services/sandbox-client.ts` |
| TryIt component | `packages/web/components/ui/TryIt.tsx` |
| InteractiveTerminal | `packages/web/components/ui/InteractiveTerminal.tsx` |
| ScalaComparisonBlock | `packages/web/components/ui/ScalaComparisonBlock.tsx` |
| CrossLanguageBlock | `packages/web/components/ui/CrossLanguageBlock.tsx` |
| SideBySide | `packages/web/components/ui/SideBySide.tsx` |
| Content schemas | `packages/web/lib/content/schemas.ts` |
| jj-git config | `packages/web/content/comparisons/jj-git/config.yml` |
| zio-cats config | `packages/web/content/comparisons/zio-cats/config.yml` |
| effect-zio config | `packages/web/content/comparisons/effect-zio/config.yml` |
| Environments | `packages/sandbox-api/src/environments/builtin.ts` |
| Spec document | `SNIPPET-VALIDATION.md` |

---

## Learned

_(Updated during implementation)_

- **Gap discovered:** `executeInitCommands` is NOT silent - PTY data callback always sends to socket (websocket.ts:207-211)
- **Gap discovered:** Server never sends `initComplete` message despite client expecting it (InteractiveTerminal.tsx:62)
- **Existing:** Client-side `initComplete` handler is already implemented and working
- **Existing:** Multi-environment Docker infrastructure (bash, node, python) is complete
- **Pattern:** Silent init needs to temporarily suppress PTY → WebSocket forwarding during command execution
- **Note:** `packages/web/scripts/` directory now exists with `sandbox-manager.ts` and `snippet-extractor.ts`
- **Solved:** Used per-session `suppressionState` Map to track output suppression. PTY callback checks this map before sending data.
- **Pre-existing bug:** `packages/sandbox-api` has TypeScript errors when run with `bun run typecheck` (uses stricter settings than root tsconfig). These are unrelated to snippet validation work.
- **Snippet extraction tested:** 324 snippets extracted from jj-git (12 steps), includes SideBySide, TryIt, and codeblock sources

---

## Progress

**P0**: 18/42 tasks complete (43%) — P0.3 Snippet Extraction complete
**P1**: 0/13 tasks complete (0%)
**P2**: 0/25 tasks complete (0%)
**Total**: 18/80 tasks complete (23%)
