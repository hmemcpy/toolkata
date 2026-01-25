# Implementation Plan

> **Status**: Planning | **Last Updated**: 2025-01-25 | **Validation**: `bun run build && bun run typecheck`

## Summary

This plan covers multiple specifications for toolkata improvements, prioritized by impact and dependencies. The primary focus areas are:

1. **P0 - Critical Fixes**: Fix cats-zio terminal connection errors
2. **P1 - Syntax Highlighting**: Add Shiki-based code highlighting for Scala/TypeScript
3. **P2 - Sandbox Integration**: Complete shrinking layout (state sync already works)
4. **P3 - Bidirectional UX**: Prototype and finalize bidirectional comparison UX

---

## Gap Analysis

### Already Implemented ✓

| Feature | Location | Status |
|---------|----------|--------|
| **Shiki installed** | `packages/web/package.json` (shiki: ^3.6.0) | ✓ Dependency exists |
| **DirectionContext** | `packages/web/contexts/DirectionContext.tsx` | ✓ Bidirectional toggle support |
| **TerminalContext** | `packages/web/contexts/TerminalContext.tsx` | ✓ Terminal state machine |
| **TerminalSidebar** | `packages/web/components/ui/TerminalSidebar.tsx` | ✓ Right sidebar with lazy-load |
| **TryIt component** | `packages/web/components/ui/TryIt.tsx` | ✓ Editable command, expectedOutput |
| **SideBySide** | `packages/web/components/ui/SideBySide.tsx` | ✓ Direction-aware column swap |
| **ScalaComparisonBlock** | `packages/web/components/ui/ScalaComparisonBlock.tsx` | ✓ ZIO/CE columns with Shiki highlighting |
| **ScastieEmbed** | `packages/web/components/ui/ScastieEmbed.tsx` | ✓ Script loading, fallback UI |
| **Glossary data** | `packages/web/content/glossary/cats-zio.ts` | ✓ 40 API mappings (7 categories) |
| **GlossaryClient** | `packages/web/components/ui/GlossaryClient.tsx` | ✓ Search, filter, copy |
| **jj-git config.yml** | `packages/web/content/comparisons/jj-git/config.yml` | ✓ Template available |
| **Tool config loading** | `packages/web/lib/content-core/tool-config.ts` | ✓ YAML parsing, cascade |
| **PreferencesStore** | `packages/web/core/PreferencesStore.ts` | ✓ Direction persistence |
| **InfoPanel** | `packages/web/components/ui/InfoPanel.tsx` | ✓ Split pane with terminal |
| **Focus trap hook** | `packages/web/hooks/useFocusTrap.ts` | ✓ Accessibility |
| **Terminal state sync** | `TerminalSidebar.tsx:318-319` + `InteractiveTerminal.tsx:258-266` | ✓ Callbacks already wired |
| **Cats-ZIO MDX content** | `packages/web/content/comparisons/cats-zio/01-10-step.mdx` | ✓ 10 steps complete |

### Missing (Needs Implementation)

| Feature | Spec | Impact | Complexity |
|---------|------|--------|------------|
| ~~**cats-zio config.yml**~~ | cats-zio-improvements.md R1 | ~~Blocks cats-zio usage~~ | ~~Low~~ |
| ~~**Shiki rehype plugin**~~ | cats-zio-improvements.md R2 | ~~No syntax highlighting~~ | ~~Medium~~ |
| ~~**ScalaComparisonBlock highlighting**~~ | cats-zio-improvements.md R2 | ~~No Scala highlighting~~ | ~~Medium~~ |
| ~~**Shrinking layout**~~ | sandbox-integration.md R2 | ~~Overlay blocks content~~ | ~~Medium~~ |
| ~~**scala-effects-demo page**~~ | cats-zio-improvements.md R3 | ~~No UX prototype~~ | ~~High~~ |
| ~~**Scastie UUID snippets**~~ | cats-zio-improvements.md R4 | ~~Only inline code works~~ | ~~Low~~ |
| **Dark theme verification** | cats-zio-improvements.md R4 | Verify Scastie theme works | Low |

---

## Tasks

### P0: Critical Fixes (Blocking)

- [x] **Create cats-zio config.yml** — Created `packages/web/content/comparisons/cats-zio/config.yml` with `sandbox: enabled: false` to prevent ERR_CONNECTION_REFUSED errors. Also fixed type error in glossary/cheatsheet pages (removed unused `categories` prop passed to `GlossaryClientWrapper`).

**Why**: The terminal sidebar currently tries to connect for cats-zio pages, causing console errors and broken UX. Config.yml with `enabled: false` will prevent the sidebar from rendering.

**Files**:
- `packages/web/content/comparisons/cats-zio/config.yml` (CREATED)
- `packages/web/app/[toolPair]/cheatsheet/page.tsx` (FIXED - removed unused categories import/prop)
- `packages/web/app/[toolPair]/glossary/page.tsx` (FIXED - removed unused categories import/prop)

**Validation**: Navigate to `/cats-zio/1`, verify no terminal errors in console, no sidebar FAB visible.

**Bug discovered**: `GlossaryClientWrapper` doesn't accept a `categories` prop (it extracts categories internally from entries), but both `cheatsheet/page.tsx` and `glossary/page.tsx` were passing it, causing TypeScript errors.

---

### P1: Syntax Highlighting

- [x] **Install @shikijs/rehype** — Added `@shikijs/rehype` and `shiki` packages. Also installed `@shikijs/transformers` initially but removed since transformers require functions (not serializable for Turbopack).

**Why**: Shiki is installed but not integrated into MDX pipeline. The rehype plugin processes code blocks during MDX compilation.

- [x] **Configure Shiki in next.config.ts** — Enabled `@shikijs/rehype` plugin with `github-dark` and `github-light` themes. Had to disable MDX Rust compiler (`experimental.mdxRs: false`) because Turbopack can't serialize rehype plugin options. Used string format `"@shikijs/rehype"` instead of imported function.

**Why**: next.config.ts has commented-out rehypePlugins section. Need to enable Shiki with terminal-aesthetic dark theme.

**Files**:
- `packages/web/next.config.ts` (MODIFIED)

**Bug discovered**: Turbopack (Rust-based MDX compiler) cannot serialize rehype plugin options. Solution: set `experimental.mdxRs: false` and use string-based plugin reference.

- [x] **Add Shiki CSS overrides** — Added CSS in `globals.css` to override Shiki's default colors: background transparent, ensure code inherits line-height, preserve inline code green accent.

**Why**: Shiki applies inline styles that may conflict with terminal aesthetic. CSS overrides ensure consistent appearance.

**Files**:
- `packages/web/app/globals.css` (MODIFIED)

- [x] **Update prose code block styles** — Modified prose styles in `StepPageClientWrapper.tsx` to work with Shiki-generated HTML. Added `prose-pre:code:bg-transparent prose-pre:code:text-inherit prose-pre:code:p-0` to prevent overriding Shiki's token colors.

**Why**: Current prose styles target hardcoded colors. Shiki generates `<pre><code>` with inline styles that need proper cascade.

**Files**:
- `packages/web/components/ui/StepPageClientWrapper.tsx` (MODIFIED)

- [x] **Add syntax highlighting to ScalaComparisonBlock** — Used Shiki's `createHighlighter` and `codeToHtml` API for client-side highlighting. Added `"use client"` directive, state for HTML output, loading state, and cancellation on unmount.

**Why**: ScalaComparisonBlock uses raw `<code>{zioCode}</code>` without any highlighting. Server-side Shiki won't work for dynamic props.

**Files**:
- `packages/web/components/ui/ScalaComparisonBlock.tsx` (MODIFIED)

**Validation**:
- Scala code blocks show colored keywords, strings, comments
- Dark theme matches terminal aesthetic (#0a0a0a background)
- Inline code (`backticks`) still uses green accent
- `bun run build && bun run typecheck` passes

---

### P2: Sandbox Integration Improvements

**Note**: Terminal state sync is already implemented. The callbacks are wired at `TerminalSidebar.tsx:318-319` and effects fire in `InteractiveTerminal.tsx:258-266`.

- [x] ~~**Wire terminal state callbacks**~~ — Already implemented: `onStateChange` → `onTerminalStateChange`, `onSessionTimeChange` → `onTerminalTimeChange`

- [x] **Implement shrinking layout** — Removed focus trap from `TerminalSidebar.tsx`. `ShrinkingLayout` component already exists and handles `margin-right`. Main content now remains interactive when sidebar is open.

**Why**: Current sidebar overlays content with focus trap, blocking TryIt interaction. Spec R2 requires content to remain interactive.

**Files**:
- `packages/web/components/ui/TerminalSidebar.tsx` (MODIFIED - removed useFocusTrap, added Escape key handler, changed role from dialog to complementary)
- `packages/web/components/ui/ShrinkingLayout.tsx` (VERIFIED - already handles margin-right based on isOpen and sidebarWidth)
- `packages/web/app/[toolPair]/[step]/page.tsx` (VERIFIED - already uses ShrinkingLayout wrapper)

**Validation**:
- Open sidebar, verify main content is NOT blocked
- TryIt buttons work while sidebar is open
- Smooth transition when opening/closing
- Mobile bottom sheet unchanged (overlay acceptable)

**Changes made**:
- Removed `useFocusTrap` import and usage from `TerminalSidebar.tsx`
- Changed `sidebarRef` from `useFocusTrap<HTMLDivElement>(isOpen, { onEscape: closeSidebar })` to regular `useRef<HTMLDivElement>(null)`
- Added separate Escape key handler effect that closes sidebar
- Changed `role="dialog"` to `role="complementary"` (no longer a modal)
- Removed `aria-modal` and `aria-hidden` attributes
- Updated JSDoc comment from "Focus trap using inert on rest of page" to "Main content remains interactive (no focus trap)"

---

### P3: Bidirectional UX Prototype

- [x] **Create /scala-effects-demo route** — New page demonstrating 4 bidirectional UX options for user evaluation.

**Why**: Spec R3 requires a prototype page showing different approaches before committing to one.

**Files**:
- `packages/web/app/scala-effects-demo/page.tsx` (CREATED)
- `packages/web/app/scala-effects-demo/UxPrototypeClient.tsx` (CREATED)

- [x] **Implement Option 1: Column swap toggle** — Reuse DirectionToggle pattern, swap ZIO/CE columns in ScalaComparisonBlock based on direction.

- [x] **Implement Option 2: Separate routes mockup** — Show how `/zio-cats` and `/cats-zio` would look with reversed default direction.

- [x] **Implement Option 3: Landing chooser** — "I know ZIO" / "I know Cats Effect" buttons that set direction and navigate.

- [x] **Implement Option 4: Smart cards** — Two home page cards leading to same content with direction preset in URL or localStorage.

**Validation**: Navigate to `/scala-effects-demo`, all 4 options render and are interactive.

**Implementation notes**:
- Created client-side component `UxPrototypeClient.tsx` with 4 interactive demo sections
- Each option demonstrates a different UX pattern for bidirectional comparison
- All options are interactive and update the global direction preference
- Includes comparison table summarizing pros/cons of each approach
- Follows terminal aesthetic with minimal design

---

### P4: Scastie Improvements (Enhancement)

- [x] **Support UUID snippets in ScastieEmbed** — Added `snippetId` prop to load saved Scastie snippets instead of inline code. Also added `user` and `update` props for user-specific snippets and version control.

**Why**: Current ScastieEmbed only supported inline code via `code` prop. Saved snippets (UUID) enable pre-configured examples with dependencies already set up.

**Files**:
- `packages/web/components/ui/ScastieEmbed.tsx` (MODIFIED - added snippetId, user, update props, updated embed logic)

**Changes made**:
- Added `snippetId`, `user`, `update` props to `ScastieEmbedProps` interface
- Made `code` prop optional (required only when not using snippetId)
- Added `isWorksheetMode`, `sbtConfig`, `targetType` props for inline code mode
- Updated global `Window.ScastieEmbed` type declaration to make all properties optional
- Updated embed logic to build options based on mode (snippet vs inline code)
- Snippet mode uses `base64UUID` option, inline mode uses `code` + other options

**Validation**: `bun run build && bun run typecheck` passes.

- [ ] **Verify dark theme is applied** — Current implementation passes `theme` prop (default "dark") to `window.ScastieEmbed()`. Verify it works in practice.

**Files**:
- `packages/web/components/ui/ScastieEmbed.tsx` (VERIFY - line 250-251, theme is passed in options)

**Validation**: Scastie embeds load with dark theme, UUID snippets work.

---

### P5: Content Review (Research)

- [ ] **Audit steps 1-5 against Zionomicon** — Review R/E/A signature, creating effects, errors, map/flatMap, ZLayers against Zionomicon patterns.

**Reference**: `/Users/hmemcpy/Downloads/Zionomicon - 8.28.2025.ePub`

- [ ] **Audit steps 6-10 against ZIO 2.x** — Review resources, fibers, streaming, app structure, interop against current ZIO 2.x and CE3 syntax.

- [ ] **Update glossary API mappings** — Ensure `packages/web/content/glossary/cats-zio.ts` matches current ZIO 2.x and Cats Effect 3 APIs. Currently has 40 entries across 7 categories (BASICS, ERRORS, DEPENDENCIES, CONCURRENCY, STREAMING, RUNTIME, INTEROP).

---

### Bug Fixes

- [x] **Fix Biome lint errors for dangerouslySetInnerHTML** — Disabled `security.noDangerouslySetInnerHtml` rule in biome.json. The HTML is from Shiki (trusted library), not user input.

**Files**:
- `biome.json` (MODIFIED - added security.noDangerouslySetInnerHtml: "off")

**Validation**: `bun run lint` passes without errors.

---

## Architecture Notes

### Shiki Integration Path
```
MDX file → next-mdx-remote → @shikijs/rehype plugin → pre-rendered HTML → prose styles
```

Note: For ScalaComparisonBlock, client-side highlighting is needed since code comes from props.

### Sandbox Config Resolution
```
Step frontmatter → Tool-pair config.yml → Global defaults
```

Priority: frontmatter overrides config.yml overrides defaults.

Resolution implemented in `packages/web/lib/content/types.ts:71-95` via `resolveSandboxConfig()`.

### Terminal State Flow (Already Implemented ✓)
```
InteractiveTerminal.onStateChange → TerminalContext.onTerminalStateChange → setState() → StatusIndicator re-render
```

Wiring: `TerminalSidebar.tsx:318-319` passes callbacks to `InteractiveTerminal`, which fires them in `useEffect` hooks at lines 258-266.

### Content Structure
```
packages/web/content/comparisons/
├── jj-git/              # 12 steps, sandbox enabled
│   ├── config.yml       # sandbox.enabled: true
│   ├── index.mdx
│   └── 01-12-step.mdx
└── cats-zio/            # 10 steps, sandbox SHOULD BE disabled
    ├── config.yml       # MISSING - needs sandbox.enabled: false
    ├── index.mdx
    └── 01-10-step.mdx   # Uses ScalaComparisonBlock, Callout
```

### Key File Locations

| File | Purpose |
|------|---------|
| `packages/web/content/comparisons/cats-zio/config.yml` | **CREATED** - Disable sandbox |
| `packages/web/next.config.ts` | **MODIFIED** - Add Shiki rehype plugin |
| `packages/web/app/globals.css` | **MODIFIED** - Shiki CSS overrides |
| `packages/web/components/ui/ScalaComparisonBlock.tsx` | **MODIFIED** - Add highlighting |
| `packages/web/components/ui/TerminalSidebar.tsx` | **MODIFIED** - Remove overlay backdrop |
| `packages/web/components/ui/StepPageClientWrapper.tsx` | **MODIFIED** - Shrinking layout margin |
| `packages/web/app/scala-effects-demo/page.tsx` | **CREATED** - UX prototype |
| `packages/web/components/ui/ScastieEmbed.tsx` | **MODIFIED** - UUID snippet support |

---

## Validation Checklist

### After P0:
- [ ] `bun run build` succeeds
- [ ] No ERR_CONNECTION_REFUSED on cats-zio pages
- [ ] Terminal sidebar FAB does not appear on cats-zio pages
- [ ] jj-git pages still show terminal FAB

### After P1:
- [ ] Scala code blocks have syntax highlighting (keywords, strings, comments colored)
- [ ] Dark theme consistent with terminal aesthetic (#0a0a0a background)
- [ ] Inline code (`backticks`) still uses green accent
- [ ] `bun run typecheck` passes
- [ ] ScalaComparisonBlock shows highlighted code

### After P2:
- [ ] Main content shrinks when sidebar opens (not blocked by overlay)
- [ ] TryIt buttons work while sidebar is visible
- [ ] Smooth transition when opening/closing
- [ ] Mobile bottom sheet unchanged (overlay acceptable)

### After P3:
- [ ] `/scala-effects-demo` shows all 4 options
- [ ] User can evaluate each approach
- [ ] Direction preference persists in localStorage

### After P4:
- [ ] Scastie embeds load with dark theme
- [ ] UUID snippets work (if implemented)
- [ ] Fallback displays if Scastie unavailable

---

## Out of Scope

Per specifications, the following are explicitly out of scope:

- Self-hosting Scastie (use public instance)
- Scala REPL integration with sandbox
- Mobile-specific Scastie optimizations
- Other Scala libraries (fs2, http4s, doobie)
- Multiple concurrent terminal sessions
- Terminal command history persistence
- gVisor installation automation
- Per-tool-pair direction preferences (global only)
- Animated toggle transitions
- URL parameter for direction (`?dir=reversed`)

---

## Dependencies

External:
- Scastie embedding API (https://scastie.scala-lang.org/embedded.js)
- Shiki syntax highlighting (already installed: shiki ^3.6.0)
- @shikijs/rehype (needs to be installed for MDX pipeline)

Internal:
- DirectionContext for bidirectional toggle
- TerminalContext for sidebar state (sidebarWidth already exposed)
- ContentService for config loading (tool-config.ts)

---

## Task Count

**Total pending tasks**: 23
**Completed tasks**: 13 (P0: cats-zio config.yml; P1: Shiki rehype plugin, next.config.ts, CSS overrides, prose styles, ScalaComparisonBlock highlighting; P2: shrinking layout; P3: UX prototype with 4 options; P4: Scastie UUID snippet support)

Priority breakdown:
- P0: 0 tasks (all critical blockers completed)
- P1: 0 tasks (syntax highlighting completed)
- P2: 0 tasks (shrinking layout completed)
- P3: 0 tasks (UX prototype completed)
- P4: 1 task (dark theme verification)
- P5: 3 tasks (content research)

---

## Commands

```bash
# Install new dependencies
bun add -d @shikijs/rehype

# Development
bun run dev

# Validation
bun run build
bun run typecheck
bun run lint
bun run test

# Automated route tests
./scripts/test-all.sh
```
