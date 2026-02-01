# Implementation Plan

> Last updated: 2026-02-01 | Generated from specs/ analysis

## Overview

This plan tracks implementation of features specified in `specs/` against the current codebase. Tasks are prioritized P0 (critical) → P1 (high) → P2 (medium) → P3 (low).

---

## Gap Analysis Summary

### Fully Implemented

| Feature | Spec | Evidence |
|---------|------|----------|
| **Core Tutorial System** | toolkata.md | Pages, MDX, progress tracking all working |
| **Admin Dashboard** | admin-dashboard.md | Rate limits, containers, metrics pages complete |
| **Terminal Sidebar** | terminal-sidebar.md | TerminalSidebar, MobileBottomSheet, TerminalToggle components |
| **Multi-Environment Sandbox** | multi-environment-sandbox.md | `environments/` directory with bash, node, python, registry, types |
| **Snippet Validation** | snippet-validation.md | `scripts/validate-snippets.ts`, `docker-validator.ts`, `config-resolver.ts` |
| **gVisor Integration** | sandbox-integration.md (R5) | config.ts, container.ts with runtime support |
| **Glossary Pages** | bidirectional-comparison.md | `/[toolPair]/glossary` route, glossary data files |
| **Effect-ZIO Tutorial** | effect-zio.md | 15 MDX steps (01-15-step.mdx), CrossLanguageBlock component |
| **ZIO-Cats Tutorial** | zionomicon-tutorial-update.md | All 15 MDX steps exist (01-15-step.mdx) |
| **JJ Kata Content** | jj-kata.md | All 7 kata MDX files (01-07-kata.mdx) with exercises and validation |
| **Kata UI Components** | jj-kata-implementation.md | KataSession, ValidationFeedback, KataLanding, GitToggle, KataProgressContext |
| **Scastie Embed** | cats-zio-improvements.md | ScastieEmbed component |
| **Shiki Syntax Highlighting** | cats-zio-improvements.md | ScalaComparisonBlock + CrossLanguageBlock use Shiki |
| **Session/Container Services** | sandbox-integration.md | Full Effect-TS services with lifecycle management |
| **Rate Limiting** | admin-dashboard.md | Per-IP rate limiting with admin adjustment endpoints |
| **Circuit Breaker** | sandbox-integration.md | Container/memory/CPU threshold protection |
| **Audit Logging** | admin-dashboard.md | Structured JSON audit events |
| **Metrics Collection** | admin-dashboard.md | System, sandbox, rate limit metrics |

### Partially Implemented

| Feature | Spec | Status | Missing |
|---------|------|--------|---------|
| **Bidirectional Comparison** | bidirectional-comparison.md | Glossary done, GitToggle exists, PreferencesStore done, useDirection hook done | Direction toggle to swap columns, DirectionToggle component, SideBySide/GlossaryClient updates |

### Not Implemented

| Feature | Spec | Notes |
|---------|------|-------|
| **Content CMS** | content-cms.md | No GitHub integration, Monaco editor, or CMS routes |

---

## P0: Critical Path (Blocking)

*No blocking items - core functionality is complete.*

---

## P1: High Priority (Core Features)

### Bidirectional Direction Toggle

Glossary page exists. GitToggle component exists (shows/hides git column in kata mode). But the direction toggle to swap columns entirely (git ↔ jj) is not implemented.

**Why:** bidirectional-comparison.md describes a global direction toggle `[git ↔ jj]` that swaps which column appears on the left vs right in SideBySide components and glossary tables. This is distinct from GitToggle which only shows/hides the git column entirely.

- [x] **Create PreferencesStore for direction preference**
  - localStorage-backed store for direction preference
  - Pattern: similar to ProgressStore in `packages/web/core/ProgressStore.ts`
  - Key: `toolkata_preferences`
  - Values: `"default"` | `"reversed"`
  - File: `packages/web/core/PreferencesStore.ts`

- [x] **Create useDirection hook**
  - Hook to read/write direction preference
  - Returns `{ direction, setDirection, isReversed, toggleDirection, isLoading, isAvailable }`
  - Reads from PreferencesStore, updates on change
  - Listens for storage events from other tabs
  - File: `packages/web/hooks/useDirection.ts`

- [x] **Create DirectionToggle component**
  - Toggle button showing `[git → jj]` or `[jj → git]`
  - Clicking swaps the direction
  - Only show for bidirectional tool pairings (jj-git has both directions)
  - Updates preference in localStorage via hook
  - File: `packages/web/components/ui/DirectionToggle.tsx`

- [x] **Update SideBySide to support reversed direction**
  - Uses `useDirection` hook to get `isReversed` state
  - Swaps left/right columns (commands, labels, comments) when reversed
  - Colors remain semantic (left=orange, right=green)
  - Accessible table also reflects swapped order
  - File: `packages/web/components/ui/SideBySide.tsx` (updated)

- [ ] **Update GlossaryClient to support reversed direction**
  - Use direction hook
  - Swap columns in table based on direction
  - Update column headers
  - File: `packages/web/components/ui/GlossaryClient.tsx` (update)

- [ ] **Add DirectionToggle to step page header**
  - Show toggle in step page header for bidirectional pairings
  - Position: near navigation or in step progress area
  - File: `packages/web/components/ui/StepProgress.tsx` or `StepPageClientWrapper.tsx` (update)

---

## P2: Medium Priority (Enhancements)

### Zionomicon Content Review

All 15 zio-cats MDX steps exist. Need review against Zionomicon book for ZIO 2.x accuracy.

**Why:** zionomicon-tutorial-update.md specifies cross-referencing with Zionomicon ePub to ensure accurate ZIO patterns and APIs.

- [ ] **Review steps 1-5 against Zionomicon**
  - Cross-reference with Zionomicon chapters
  - Verify ZIO 2.x API accuracy (Effect → ZIO naming)
  - Check error handling patterns
  - Files: `packages/web/content/comparisons/zio-cats/01-step.mdx` through `05-step.mdx`

- [ ] **Review steps 6-10 against Zionomicon**
  - Cross-reference concurrency chapters
  - Update Fiber, parallel, and race patterns
  - Verify correct ZIO 2.x signatures
  - Files: `packages/web/content/comparisons/zio-cats/06-step.mdx` through `10-step.mdx`

- [ ] **Review steps 11-15 against Zionomicon**
  - Verify STM, concurrent data structures, config, HTTP, database content
  - Ensure modern ZIO ecosystem patterns
  - Files: `packages/web/content/comparisons/zio-cats/11-step.mdx` through `15-step.mdx`

---

## P3: Low Priority (Large Feature)

### Content CMS

GitHub-native content management system. See `specs/content-cms.md` for full specification.

**Scope:** Single GitHub repository in Phase 1. All file operations via GitHub API (octokit). Branch-based workflow with PR required for content changes.

**Backend (sandbox-api)**

- [ ] **Install octokit dependency**
  - Add `@octokit/rest` to sandbox-api package
  - File: `packages/sandbox-api/package.json`

- [ ] **Create GitHub config**
  - GitHub token configuration (GITHUB_TOKEN env var)
  - Repository settings (owner, repo, default branch)
  - File: `packages/sandbox-api/src/config/github.ts`

- [ ] **Create GitHubService (Effect-TS)**
  - Repository operations: getTree, getFile, createFile, updateFile, deleteFile
  - Branch operations: listBranches, createBranch, deleteBranch
  - Commit operations: getCommit, createCommit, getCommitHistory
  - PR operations: createPR, getPRStatus
  - Error types: NotFound, Unauthorized, RateLimited, ValidationFailed, ConflictError
  - File: `packages/sandbox-api/src/services/github.ts`

- [ ] **Create ContentValidationService (Effect-TS)**
  - Wrapper around existing snippet validation for CMS use
  - Validates MDX content before commit
  - Returns structured validation results
  - File: `packages/sandbox-api/src/services/content-validation.ts`

- [ ] **Create CMS API routes**
  - File operations: GET/PUT/DELETE `/admin/cms/file/:path`
  - File listing: GET `/admin/cms/files` (tree view)
  - Validation: POST `/admin/cms/validate`
  - Branch operations: GET/POST `/admin/cms/branches`
  - Commit operations: GET `/admin/cms/commits`
  - PR operations: POST `/admin/cms/pr`
  - File: `packages/sandbox-api/src/routes/admin-cms.ts`

**Frontend (web) - Dependencies**

- [ ] **Install Monaco and diff viewer dependencies**
  - Add `@monaco-editor/react` for code editing
  - Add `react-diff-viewer-continued` for commit diffs
  - Add `use-debounce` for auto-save
  - File: `packages/web/package.json`

**Frontend (web) - Services**

- [ ] **Create CMS API client (Effect-TS)**
  - Client for all CMS API endpoints
  - File operations, branch management, validation
  - Error handling matching backend error types
  - File: `packages/web/services/cms-client.ts`

**Frontend (web) - Components**

- [ ] **Create FileBrowser component**
  - Tree view with file type icons (MDX, YAML, images)
  - Search and filtering
  - File selection with multi-select for batch operations
  - Context menu (rename, delete, copy path)
  - File: `packages/web/components/cms/FileBrowser.tsx`

- [ ] **Create FileEditor component with Monaco**
  - MDX syntax highlighting and autocomplete
  - Multi-file tabs (max 10 open files)
  - Auto-save to localStorage (debounced)
  - Keyboard shortcuts (Ctrl+S save, Ctrl+W close, Ctrl+Tab switch)
  - Dirty indicator for unsaved changes
  - File: `packages/web/components/cms/FileEditor.tsx`

- [ ] **Create MDXPreview component**
  - Live preview with app's MDX components (SideBySide, CodeBlock, etc.)
  - Split pane layout (50/50 editor/preview)
  - Sync scroll with editor
  - Error boundary for render failures
  - File: `packages/web/components/cms/MDXPreview.tsx`

- [ ] **Create ValidationPanel component**
  - Error list with line numbers
  - Severity icons (error, warning, info)
  - Click to jump to line in editor
  - Re-run validation button
  - File: `packages/web/components/cms/ValidationPanel.tsx`

- [ ] **Create BranchSelector component**
  - Dropdown with branch list
  - Current branch indicator
  - Create new branch option
  - Switch branch with unsaved changes warning
  - File: `packages/web/components/cms/BranchSelector.tsx`

- [ ] **Create PRDialog component**
  - PR title and body editor
  - Validation check before create
  - Target branch selector
  - Link to created PR
  - File: `packages/web/components/cms/PRDialog.tsx`

- [ ] **Create HistoryPanel component**
  - Commit list with author, date, message
  - Diff viewer for selected commit
  - File-level change list
  - File: `packages/web/components/cms/HistoryPanel.tsx`

- [ ] **Create CreateFileDialog component**
  - Template picker (step, kata, overview, cheatsheet)
  - Name input with validation (slug format)
  - Parent folder selector
  - Pre-fill frontmatter from template
  - File: `packages/web/components/cms/CreateFileDialog.tsx`

**Frontend (web) - Integration**

- [ ] **Create CMS admin page**
  - Main CMS interface combining FileBrowser, FileEditor, MDXPreview
  - Three-column layout (browser | editor | preview)
  - Responsive: collapse preview on smaller screens
  - File: `packages/web/app/admin/(dashboard)/cms/page.tsx`

- [ ] **Create CMS layout with branch selector**
  - Layout with BranchSelector in header
  - ValidationPanel in bottom area
  - File: `packages/web/app/admin/(dashboard)/cms/layout.tsx`

- [ ] **Create CMS history page**
  - File history view with diffs
  - Commit details
  - File: `packages/web/app/admin/(dashboard)/cms/history/page.tsx`

- [ ] **Add CMS to admin sidebar**
  - "Content" menu item with icon
  - File: `packages/web/components/admin/AdminSidebar.tsx` (update)

- [ ] **Write Playwright tests for CMS**
  - File browsing, selection
  - Editor open, edit, save
  - Validation workflow
  - Branch switching
  - PR creation flow
  - File: `packages/web/tests/cms.spec.ts`

---

## Task Dependencies

```
Bidirectional Toggle:
  PreferencesStore
    → useDirection hook
      → DirectionToggle component
        → SideBySide update
        → GlossaryClient update
        → StepProgress/header integration

Content CMS:
  Backend:
    octokit dependency
      → GitHub config
        → GitHubService
          → ContentValidationService
            → CMS API routes

  Frontend:
    Monaco dependencies
      → cms-client service
        → Components (parallel):
            - FileBrowser
            - FileEditor
            - MDXPreview
            - ValidationPanel
            - BranchSelector
            - PRDialog
            - HistoryPanel
            - CreateFileDialog
          → CMS page + layout
            → Sidebar update
              → Playwright tests
```

---

## Validation Commands

```bash
# Type check
cd packages/web && bun run typecheck
cd packages/sandbox-api && bun run typecheck

# Lint
cd packages/web && bun run lint
cd packages/sandbox-api && bun run lint

# Tests
cd packages/web && bun run test

# Build
cd packages/web && bun run build

# Snippet validation
cd packages/web && bun run validate:snippets
```

---

## Notes

1. **JJ Kata content is COMPLETE** - All 7 kata MDX files exist with proper exercises and validation configurations. The UI and validation infrastructure is also complete.

2. **Direction toggle is distinct from GitToggle** - GitToggle (in kata) shows/hides git column entirely for immersive learning. Direction toggle swaps which tool appears on which side in comparisons.

3. **ZIO-Cats steps 11-15 already exist** - they need content review for Zionomicon accuracy, not creation. Focus on verifying ZIO 2.x APIs and patterns.

4. **CMS is large but well-specified** - see specs/content-cms.md for full breakdown. All backend and frontend work is additive, no changes to existing content workflow required.

5. **Environments infrastructure is complete** - registry, types, builtin environments (bash, node, python) are all implemented. No work needed on multi-environment sandbox.

6. **Admin dashboard is fully functional** - Rate limits, containers, metrics pages work. NextAuth with Google OAuth is configured.

7. **sandbox-api has pre-existing type errors** - `bun run typecheck` in sandbox-api fails with Effect-TS type mismatches in `environments/index.ts`, `routes/sessions.ts`, and `services/container.ts`. These are `exactOptionalPropertyTypes` issues with Effect return types (`Effect<undefined, ...>` vs `Effect<void, ...>`) and index signature access patterns.

8. **Playwright tests have pre-existing failures** - `bun run test` in packages/web shows ~50 failures unrelated to new changes. Issues include localStorage access SecurityError in Glossary tests and admin sidebar visibility assertions. These need investigation as they may be test environment issues.

---

## Task Count

| Priority | Pending | Completed |
|----------|---------|-----------|
| P0 | 0 | 0 |
| P1 | 2 | 4 |
| P2 | 3 | 0 |
| P3 | 21 | 0 |
| **Total** | **26** | **4** |
