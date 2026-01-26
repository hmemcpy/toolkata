# Implementation Plan: Snippet Validation System

> **Scope**: Multiple related files | **Risk**: Aggressive | **Validation**: `bun run build && bun run typecheck && bun run lint && bun test`

## Summary

Build a headless snippet validation system that extracts code from MDX, executes against sandbox environments, and fails the build on errors. Priority: get jj-git working end-to-end first, then expand to Scala/TypeScript. Uses existing SandboxClient infrastructure with new silent init command support.

---

## Phase 1: Silent Init Commands in Sandbox API

- [ ] **Add silent flag to WebSocket init message** — Update `packages/sandbox-api/src/services/websocket.ts` to support `{ type: "init", commands: [...], silent: true }` that suppresses output
- [ ] **Implement output buffering for silent mode** — Buffer init command output, only send on error or if `silent: false`
- [ ] **Add initComplete response with success/error** — Return `{ type: "initComplete", success: boolean, error?: string, output?: string }`
- [ ] **Test silent init manually** — Create test script that connects via WebSocket, sends silent init, verifies no output leakage

## Phase 2: Sandbox Manager (Auto-start)

- [ ] **Create sandbox-manager.ts** — New file `packages/web/scripts/sandbox-manager.ts` with `ensureSandboxRunning()` function
- [ ] **Implement health check** — `GET /api/v1/status` with timeout, return boolean
- [ ] **Implement spawn logic** — `Bun.spawn()` for sandbox-api dev server, wait for healthy (30s timeout)
- [ ] **Implement cleanup function** — Kill child process, await exit
- [ ] **Add environment variable support** — `SANDBOX_API_URL` override for CI/custom setups

## Phase 3: Snippet Extraction (jj-git only)

- [ ] **Create snippet-extractor.ts** — New file `packages/web/scripts/snippet-extractor.ts`
- [ ] **Implement MDX file discovery** — Glob `content/comparisons/jj-git/**/*.mdx`
- [ ] **Extract SideBySide commands** — Regex for `<SideBySide` component, parse `fromCommands` and `toCommands` arrays
- [ ] **Extract TryIt commands** — Regex for `<TryIt` component, parse `command` prop
- [ ] **Extract markdown code blocks** — Regex for ` ```bash` blocks
- [ ] **Implement normalizeCode** — Strip `|` prefix (reuse logic from ScalaComparisonBlock)
- [ ] **Output ExtractedSnippet interface** — `{ file, toolPair, step, lineStart, language, source, code, prop? }`

## Phase 4: Config Resolution

- [ ] **Create config-resolver.ts** — New file `packages/web/scripts/config-resolver.ts`
- [ ] **Load pairing config.yml** — Parse `content/comparisons/{pairing}/config.yml` validation section
- [ ] **Parse step frontmatter** — Extract `validation:` section from MDX frontmatter
- [ ] **Merge config hierarchy** — Pairing → Step → Component (imports concatenate, setup overrides)
- [ ] **Add validation schema to frontmatter** — Update `packages/web/lib/content/schemas.ts` with optional `validation` field

## Phase 5: Headless Validator (jj-git)

- [ ] **Create headless-validator.ts** — New file `packages/web/scripts/headless-validator.ts`
- [ ] **Implement session creation** — Use SandboxClient to create session for tool pair
- [ ] **Implement command execution** — Send command via WebSocket, collect output until prompt returns
- [ ] **Implement error detection for shell** — Check for `error:`, `fatal:`, `usage:` patterns in output
- [ ] **Implement session reuse per step** — Group snippets by step, single session per step
- [ ] **Implement cleanup** — Destroy session after step completes

## Phase 6: CLI Entry Point

- [ ] **Create validate-snippets.ts** — New file `packages/web/scripts/validate-snippets.ts`
- [ ] **Implement CLI argument parsing** — `--strict`, `--tool-pair`, `--step`, `--verbose`
- [ ] **Orchestrate validation flow** — Sandbox manager → Extract → Resolve config → Validate → Report
- [ ] **Implement console reporter** — Per-step pass/fail, summary, failure details with file:line
- [ ] **Exit with code 1 on failures** — For CI integration

## Phase 7: Step-Level Caching

- [ ] **Create validation-cache.ts** — New file `packages/web/scripts/validation-cache.ts`
- [ ] **Implement step hash computation** — SHA256 of (config.yml + step MDX content)
- [ ] **Implement cache storage** — JSON file in `.validation-cache/` directory
- [ ] **Implement cache lookup** — Skip validation if hash matches
- [ ] **Add --no-cache flag** — Force re-validation

## Phase 8: Validation Config for jj-git

- [ ] **Update jj-git config.yml** — Add `validation:` section with prelude setup commands
- [ ] **Test end-to-end jj-git validation** — Run `bun run scripts/validate-snippets.ts --tool-pair jj-git`
- [ ] **Fix any failing snippets** — Update MDX or config as needed

## Phase 9: Build Integration

- [ ] **Add validate:snippets script** — Update `packages/web/package.json`
- [ ] **Add prebuild hook** — Run validation before `next build` (with `--strict`)
- [ ] **Create Playwright test for validation** — Test that validation script runs and reports correctly

## Phase 10: Scala Environment (zio-cats)

- [ ] **Create Dockerfile.scala** — Eclipse Temurin JDK 21 + scala-cli + pre-cached deps
- [ ] **Register scala environment** — Update `packages/sandbox-api/src/environments/builtin.ts`
- [ ] **Update docker-build-all.sh** — Build scala image
- [ ] **Extend snippet-extractor for ScalaComparisonBlock** — Extract `zioCode`, `catsEffectCode` props
- [ ] **Implement Scala validation logic** — Write snippet to file, run `scala-cli compile`, check exit code
- [ ] **Add zio-cats config.yml validation section** — Imports prelude for ZIO and Cats Effect
- [ ] **Test zio-cats validation** — Run full validation, fix any issues

## Phase 11: TypeScript Environment (effect-zio)

- [ ] **Create Dockerfile.typescript** — Node 22 + tsx + typescript + effect
- [ ] **Register typescript environment** — Update builtin.ts
- [ ] **Extend snippet-extractor for CrossLanguageBlock** — Extract `zioCode`, `effectCode` props
- [ ] **Implement TypeScript validation logic** — Write snippet to file, run `tsc --noEmit`, check exit code
- [ ] **Add effect-zio config.yml validation section** — Imports prelude for Effect
- [ ] **Test effect-zio validation** — Run full validation, fix any issues

## Phase 12: Component Props Support

- [ ] **Add validate prop to ScalaComparisonBlock** — Skip validation when `validate={false}`
- [ ] **Add validate prop to CrossLanguageBlock** — Skip validation when `validate={false}`
- [ ] **Add validate prop to SideBySide** — Skip validation when `validate={false}`
- [ ] **Add setup prop to TryIt** — Override prelude setup for specific command
- [ ] **Add extraImports prop to comparison blocks** — Extend prelude imports

## Phase 13: CI Integration

- [ ] **Create GitHub Actions workflow** — `.github/workflows/validate-snippets.yml`
- [ ] **Configure sandbox-api startup in CI** — Docker or local spawn
- [ ] **Add caching for validation results** — Cache `.validation-cache/` directory
- [ ] **Test PR validation** — Verify workflow runs on content changes

---

## Task Count

**Total**: 54 tasks
- Phase 1 (Silent Init): 4 tasks
- Phase 2 (Sandbox Manager): 5 tasks
- Phase 3 (Extraction): 7 tasks
- Phase 4 (Config): 4 tasks
- Phase 5 (Validator): 6 tasks
- Phase 6 (CLI): 5 tasks
- Phase 7 (Caching): 5 tasks
- Phase 8 (jj-git Config): 3 tasks
- Phase 9 (Build): 3 tasks
- Phase 10 (Scala): 7 tasks
- Phase 11 (TypeScript): 6 tasks
- Phase 12 (Props): 5 tasks
- Phase 13 (CI): 4 tasks

**Progress**: 0/54 tasks complete (0%)

---

## Dependencies

```
Phase 1 (Silent Init) ──────────────────────────┐
                                                 │
Phase 2 (Sandbox Manager) ──────────────────────┤
                                                 │
Phase 3 (Extraction) ───────────────────────────┼──► Phase 5 (Validator) ──► Phase 6 (CLI)
                                                 │           │
Phase 4 (Config) ───────────────────────────────┘           │
                                                             │
                                    Phase 7 (Caching) ◄──────┘
                                             │
                                             ▼
                        Phase 8 (jj-git) ──► Phase 9 (Build) ──► Phase 13 (CI)
                                             │
                        Phase 10 (Scala) ◄───┴───► Phase 11 (TypeScript)
                                             │
                        Phase 12 (Props) ◄───┘
```

**Critical Path**: Phase 1 → Phase 2 → Phase 3 → Phase 5 → Phase 6 → Phase 8 (jj-git working E2E)

---

## Commands

```bash
# Development
cd packages/sandbox-api && bun run dev  # Start sandbox API
cd packages/web && bun run dev          # Start web dev server

# Validation
bun run --cwd packages/web scripts/validate-snippets.ts --tool-pair jj-git
bun run --cwd packages/web scripts/validate-snippets.ts --strict

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
| Environments | `packages/sandbox-api/src/environments/builtin.ts` |
| Spec document | `SNIPPET-VALIDATION.md` |

---

## Learned

_(Updated during implementation)_

---

## Gap Analysis (2026-01-26)

### What Already Exists

**Multi-Environment Docker Infrastructure (can be leveraged):**
- `packages/sandbox-api/src/environments/` - Complete environment registry with Effect-TS service
- `packages/sandbox-api/src/environments/builtin.ts` - 3 environments registered (bash, node, python)
- `packages/sandbox-api/docker/environments/` - Dockerfiles for bash, node, python
- `packages/sandbox-api/scripts/docker-build-all.sh` - Multi-environment build with 11 tests

**WebSocket Init Commands (partial - needs enhancement):**
- `websocket.ts` lines 89-94, 292-329: `executeInitCommands()` method exists
- Runs commands silently (doesn't echo to user), has 200ms delays, 30s timeout
- **Missing:** `silent: true` flag option, `initComplete` response type

**Content Infrastructure:**
- `packages/web/lib/content/schemas.ts` - Zod frontmatter validation (needs `validation` field added)
- `packages/web/lib/content/types.ts` - `SandboxConfig` type, `resolveSandboxConfig()` function
- All 3 `config.yml` files exist (need `validation:` sections added)

### What Does NOT Exist (54 tasks remain)

**Validation Scripts (0/6 created):**
- [ ] `packages/web/scripts/validate-snippets.ts`
- [ ] `packages/web/scripts/snippet-extractor.ts`
- [ ] `packages/web/scripts/headless-validator.ts`
- [ ] `packages/web/scripts/config-resolver.ts`
- [ ] `packages/web/scripts/sandbox-manager.ts`
- [ ] `packages/web/scripts/validation-cache.ts`

**New Docker Environments (0/2):**
- [ ] `packages/sandbox-api/docker/environments/scala/Dockerfile`
- [ ] `packages/sandbox-api/docker/environments/typescript/Dockerfile`

**Component Props (0/4):**
- [ ] `ScalaComparisonBlock.tsx` - needs `validate`, `extraImports` props
- [ ] `CrossLanguageBlock.tsx` - needs `validate`, `extraImports` props
- [ ] `SideBySide.tsx` - needs `validate` prop
- [ ] `TryIt.tsx` - needs `setup` prop

**Config Updates (0/3):**
- [ ] `jj-git/config.yml` - needs `validation:` section
- [ ] `zio-cats/config.yml` - needs `validation:` section with Scala imports/wrapper
- [ ] `effect-zio/config.yml` - needs `validation:` + `secondary:` sections

**Other:**
- [ ] `.github/workflows/validate-snippets.yml`
- [ ] `.validation-cache/` directory structure
- [ ] `packages/web/lib/content/schemas.ts` - add `validation` field to frontmatter

### Critical Path Confirmed

Phase 1 → Phase 2 → Phase 3 → Phase 5 → Phase 6 → Phase 8 gets jj-git working E2E.

Priority order:
1. **P0** - Phases 1-6, 8 (jj-git E2E) — unblocks all content validation
2. **P1** - Phases 7, 9 (caching, build integration) — enables CI workflow
3. **P2** - Phases 10-13 (Scala/TS environments, component props, CI) — completes system
