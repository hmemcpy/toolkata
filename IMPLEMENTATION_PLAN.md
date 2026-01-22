# Implementation Plan: Terminal Sidebar + Tutor Migration

> **Scope**: Multiple related files | **Risk**: Aggressive | **Validation**: bun run typecheck && bun run lint && bun run build

---

## CRITICAL: Tutor Package Guidelines

**This project uses local tutor packages from `~/git/tutor` via `bun link`.**

### Authoritative Source

All code MUST strictly follow `~/git/tutor/AGENTS.md`. This is NON-NEGOTIABLE.

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

### Re-linking Packages

If tutor packages change, re-link:

```bash
cd ~/git/tutor && bun link
cd ~/git/toolkata/packages/web && bun link @hmemcpy/tutor-config @hmemcpy/tutor-content-core
cd ~/git/toolkata/packages/sandbox-api && bun link @hmemcpy/tutor-config
```

---

## Summary

Two related efforts:
1. **Tutor Migration Completion**: Finish migrating to `@hmemcpy/tutor-*` packages (sandbox-api tsconfig, content tests)
2. **Terminal Sidebar**: Refactor the sandbox terminal from an embedded bottom section to a collapsible right sidebar with TryIt MDX components

**Note**: Playwright tests are deferred to the final phase to avoid blocking the build loop.

---

## Gap Analysis (Updated 2026-01-22, verified)

### Already Implemented ✓

- **DirectionContext** - Complete provider, hook, SSR-safe patterns (`contexts/DirectionContext.tsx`)
- **InteractiveTerminal** - xterm.js with WebSocket, state machine (IDLE → CONNECTING → CONNECTED → TIMEOUT_WARNING → EXPIRED → ERROR → STATIC)
- **Keyboard navigation** - ←/→ arrows, `?` for help, local Escape handling (`hooks/useKeyboardNavigation.ts`)
- **MDXComponents.tsx** - Centralized registry with `SideBySideWithDirection`, `Callout`, `Pre`, `Code` (line 86-93)
- **Providers.tsx** - Composition pattern (wraps DirectionProvider)
- **Design tokens** - Terminal theme in globals.css
- **Playwright tests** - Browser, direction, glossary tests in `packages/web/tests/`
- **Terminal wrapper components** - `TerminalWithSuggestions.tsx`, `TerminalWithSuggestionsWrapper.tsx`, `CommandSuggestions.tsx`
- **StepPageClientWrapper** - Renders terminal at bottom of step pages with "Try It Yourself" section

### Not Implemented ✗

| Component | Status | Notes |
|-----------|--------|-------|
| TerminalContext | ❌ Missing | No file at `contexts/TerminalContext.tsx` - confirmed via Glob |
| TerminalSidebar | ❌ Missing | Desktop sidebar component |
| MobileBottomSheet | ❌ Missing | Mobile bottom sheet component |
| TerminalToggle (FAB) | ❌ Missing | Floating action button |
| TryIt MDX component | ❌ Missing | TODO comment at MDXComponents.tsx:91-92, component not implemented |
| Keyboard shortcut `t` | ❌ Missing | useKeyboardNavigation.ts only has arrows and `?` |
| sandbox-api tsconfig | ❌ Uses old config | Line 2: `"extends": "../../tsconfig.json"` |
| Content loading tests | ❌ Missing | No `*.test.ts` files in packages/web/tests/ - only `*.spec.ts` (Playwright) |

### Issues Discovered

1. **Step page uses wrong SideBySide** - `app/[toolPair]/[step]/page.tsx:7` imports plain `SideBySide`, line 53-57 defines local `mdxComponents` instead of importing centralized registry
2. **Duplicate MDX registration** - Step page has its own `mdxComponents` definition (lines 53-57) instead of importing from `components/mdx/MDXComponents.tsx`
3. **Direct component imports** - Step page imports `Callout` (line 3), `CodeBlock` (line 4), `SideBySide` (line 7) directly - these are redundant when using centralized registry

---

## Tasks

### Phase 0: Tutor Migration Completion (P0 - Foundation)

> **WHY**: Complete infrastructure cleanup before adding new features. Ensures consistent TypeScript strictness across packages.
> **Spec**: `specs/tutor-migration.md`

- [x] **0.1** Update `packages/sandbox-api/tsconfig.json` to use tutor-config
  - Change `extends` from `../../tsconfig.json` to `@hmemcpy/tutor-config/tsconfig.library.json`
  - Keep existing `outDir: "dist"` and `rootDir: "src"` if needed
  - Add `@hmemcpy/tutor-config` as devDependency
  - Run `bun run typecheck` and fix any new errors
  - Note: Effect-TS context inference issues with `exactOptionalPropertyTypes` are known

- [ ] **0.2** Add content loading unit tests (Bun test, not Playwright)
  - Create `packages/web/tests/content.test.ts`
  - Test `loadStep("jj-git", 1)` returns valid content
  - Test `loadStep("invalid", 999)` returns null (NotFound)
  - Test `loadIndex("jj-git")` returns valid content
  - Test `loadCheatsheet("jj-git")` returns valid content
  - Test frontmatter validation rejects invalid data

- [ ] **0.3** Validate tutor migration
  ```bash
  bun run typecheck        # Both packages
  bun run lint             # Root level
  bun run build            # Web package
  ```

---

### Phase 0.5: MDX Component Cleanup (P0 - Bug Fix)

> **WHY**: Step page uses wrong SideBySide variant and duplicates MDX component definitions.
> **Discovery**: Gap analysis found step page imports SideBySide directly (line 7), missing direction context.

- [ ] **0.5.1** Fix step page MDX component import
  - Location: `packages/web/app/[toolPair]/[step]/page.tsx`
  - Remove local `mdxComponents` definition (lines 53-57):
    ```typescript
    const mdxComponents = {
      Callout,
      CodeBlock,
      SideBySide,
    }
    ```
  - Remove direct imports (lines 3-4, 7):
    - Line 3: `import { Callout } from "../../../components/ui/Callout"`
    - Line 4: `import { CodeBlock } from "../../../components/ui/CodeBlock"`
    - Line 7: `import { SideBySide } from "../../../components/ui/SideBySide"`
  - Add import: `import { mdxComponents } from "../../../components/mdx/MDXComponents"`
  - This gives access to `SideBySideWithDirection` (direction-aware) instead of plain `SideBySide`
  - Also provides proper `pre`/`code` handling via centralized `Pre` and `Code` components

- [ ] **0.5.2** Verify MDXComponents.tsx exports are sufficient
  - Location: `packages/web/components/mdx/MDXComponents.tsx`
  - CodeBlock is used internally via `Pre` component for fenced code blocks
  - Direct `CodeBlock` export not needed if step page uses centralized `mdxComponents`
  - Verify that after task 0.5.1, all MDX rendering works correctly

---

### Phase 1: Foundation (Context & State)

> **WHY**: Terminal sidebar requires shared state across components. Context pattern matches DirectionContext.
> **Spec**: `specs/terminal-sidebar.md`

- [x] **1.1** Create `TerminalContext` at `packages/web/contexts/TerminalContext.tsx`
  - Define `TerminalState` type: `"IDLE" | "CONNECTING" | "CONNECTED" | "TIMEOUT_WARNING" | "EXPIRED" | "ERROR"`
  - Define `TerminalContextValue` interface:
    ```typescript
    interface TerminalContextValue {
      readonly state: TerminalState
      readonly isOpen: boolean
      readonly sessionTimeRemaining: number | null
      readonly openSidebar: () => void
      readonly closeSidebar: () => void
      readonly toggleSidebar: () => void
      readonly executeCommand: (command: string) => void
      readonly registerTerminal: (ref: TerminalRef) => void
    }
    ```
  - Create context with `createContext<TerminalContextValue | null>(null)`
  - Create `useTerminalContext()` hook with helpful error if used outside provider
  - Follow DirectionContext patterns exactly
  - **MUST** follow ~/git/tutor/AGENTS.md (readonly, no assertions, explicit types)
  - **Note**: Implemented TerminalProvider in same file as TerminalContext (matching DirectionContext pattern)

- [x] **1.2** ~~Create `TerminalProvider` at `packages/web/components/TerminalProvider.tsx~~ **(MERGED WITH 1.1)**
  - ~~Manage sidebar open/closed state~~ Implemented
  - ~~Hold ref to `InteractiveTerminalRef`~~ Implemented as `TerminalRef`
  - ~~Implement `executeCommand()` that opens sidebar if closed, then calls insertCommand~~ Implemented
  - ~~Manage terminal state machine (subscribe to InteractiveTerminal state changes)~~ State managed, callbacks in Phase 3
  - ~~Track session time remaining~~ Implemented
  - ~~Focus management: auto-focus close button when sidebar opens~~ To be done in Phase 2
  - ~~Handle command queuing when terminal is CONNECTING~~ Implemented
  - **MUST** use `for...of` not `forEach`, handle all index access **FOLLOWED**

- [ ] **1.3** Add sidebar design tokens to `packages/web/app/globals.css`
  - `--sidebar-width: 400px`
  - `--sidebar-z-index: 40`
  - `--backdrop-z-index: 30`
  - `--toggle-z-index: 50`
  - `--transition-sidebar: 300ms ease-in-out`
  - Add `prefers-reduced-motion` rule for sidebar transitions

- [ ] **1.4** Update `Providers.tsx` to include TerminalProvider
  - Location: `packages/web/components/Providers.tsx`
  - Wrap children with TerminalProvider (inside DirectionProvider)
  - Pass toolPair to TerminalProvider

---

### Phase 2: Sidebar UI Components

> **WHY**: Core UI for terminal sidebar feature.
> **Spec**: `specs/terminal-sidebar.md` sections R1, R2, R6

- [ ] **2.1** Create `TerminalSidebar.tsx` at `packages/web/components/ui/TerminalSidebar.tsx`
  - Fixed right sidebar (desktop lg+)
  - 400px width, full height, overlay mode (no content push)
  - Header: "Terminal" title, status indicator, close button (X)
  - Body: Lazy-loaded InteractiveTerminal via dynamic import
  - Footer: Reset button, session timer
  - Accessibility: `aria-label`, `aria-hidden`, `id="terminal-sidebar"`
  - Focus trap implementation using inert on rest of page
  - Slide-in animation from right (transform + opacity)
  - Uses `useTerminalContext()` for state
  - **MUST** have explicit return type on component function

- [ ] **2.2** Create `MobileBottomSheet.tsx` at `packages/web/components/ui/MobileBottomSheet.tsx`
  - Bottom sheet for viewports < lg (1024px)
  - ~60% viewport height, max 600px
  - Drag handle at top (24px, visual affordance)
  - Swipe-to-close gesture (100px threshold)
  - Same content as desktop sidebar (terminal, footer)
  - Accessibility: `role="dialog"`, `aria-modal="true"`, `aria-label`
  - Focus trap when open
  - Uses touch events for swipe detection

- [ ] **2.3** Create `TerminalToggle.tsx` at `packages/web/components/ui/TerminalToggle.tsx`
  - FAB button in bottom-right corner
  - 56px touch target (≥44px requirement)
  - Connection indicator dot (green when CONNECTED, gray otherwise)
  - Hidden when sidebar open (desktop)
  - Visible on all viewports
  - Accessibility: `aria-label`, `aria-expanded`, `aria-controls="terminal-sidebar"`
  - Keyboard: Enter/Space to toggle

---

### Phase 3: Layout Integration

> **WHY**: Wire sidebar and toggle into the layout structure.
> **Spec**: `specs/terminal-sidebar.md` section R4 (persistence)

- [ ] **3.1** Update `app/[toolPair]/layout.tsx` to render sidebar
  - Add `<TerminalSidebar />` at layout level (after children, in Providers)
  - Add `<TerminalToggle />` at layout level
  - Sidebar renders as fixed overlay (no grid changes needed)
  - Content maintains full width (sidebar overlays)

- [ ] **3.2** Update `InteractiveTerminal.tsx` with state change callback
  - Add `onStateChange?: (state: TerminalState) => void` prop
  - Call callback whenever internal state changes
  - Add `onSessionTimeChange?: (remaining: number) => void` prop
  - Expose session time remaining via callback

- [ ] **3.3** Remove terminal from StepPageClientWrapper
  - Remove `suggestedCommands` prop from StepPageClientWrapper
  - Remove `TerminalWithSuggestionsWrapper` from step page render
  - Remove "Try It Yourself" section heading
  - Clean up unused imports

---

### Phase 4: TryIt Component

> **WHY**: Allow MDX content to trigger commands in sidebar terminal.
> **Spec**: `specs/terminal-sidebar.md` section R3

- [ ] **4.1** Create `TryIt.tsx` at `packages/web/components/ui/TryIt.tsx`
  - Props: `command: string`, `description?: string`
  - Display command in monospace code block (same style as CodeBlock)
  - Green "Run" button (min 44px height, min 80px width)
  - Optional description text below command
  - States: default → executing ("Sent" flash, 500ms)
  - Accessibility: `aria-label={`Run command: ${command}`}`
  - Debounce clicks (500ms)
  - Calls `executeCommand()` from `useTerminalContext()`
  - If terminal not started, executeCommand handles auto-start
  - **MUST** handle all readonly props, explicit return types

- [ ] **4.2** Register TryIt in MDX components
  - Location: `packages/web/components/mdx/MDXComponents.tsx`
  - Add `TryIt` to mdxComponents object
  - Import from `../ui/TryIt`
  - Test in step MDX file with `<TryIt command="jj status" />`

---

### Phase 5: Keyboard Navigation

> **WHY**: Keyboard shortcuts for power users.
> **Spec**: `specs/terminal-sidebar.md` Accessibility section

- [ ] **5.1** Add terminal keyboard shortcuts to `useKeyboardNavigation.ts`
  - Add `t` shortcut to toggle terminal
  - Ensure shortcuts don't fire when terminal input is focused (check for role="textbox")
  - Location: `packages/web/hooks/useKeyboardNavigation.ts`
  - Update shortcut documentation

- [ ] **5.2** Add Esc handler to TerminalSidebar
  - Close sidebar on Escape key
  - Only when sidebar is open and focused
  - Return focus to toggle button or last TryIt clicked (track trigger element)

---

### Phase 6: Cleanup

> **WHY**: Remove deprecated components and simplify code.

- [ ] **6.1** Update `app/[toolPair]/[step]/page.tsx`
  - Remove `suggestedCommands` extraction from frontmatter (lines 99-101)
  - Remove passing `suggestedCommands` to StepPageClientWrapper (line 115)
  - Simplify step page props

- [ ] **6.2** Remove `TerminalWithSuggestionsWrapper.tsx`
  - Delete file: `packages/web/components/ui/TerminalWithSuggestionsWrapper.tsx`
  - Remove exports from any index files

- [ ] **6.3** Remove `TerminalWithSuggestions.tsx`
  - Delete file: `packages/web/components/ui/TerminalWithSuggestions.tsx`
  - Remove exports from any index files

- [ ] **6.4** Remove `CommandSuggestions.tsx`
  - Delete file: `packages/web/components/ui/CommandSuggestions.tsx`
  - Functionality replaced by TryIt component

---

### Phase 7: Build Validation

> **WHY**: Ensure all implementation compiles and builds before running potentially-blocking Playwright tests.

- [ ] **7.1** Run full build validation
  ```bash
  bun run typecheck  # Zero errors in both packages
  bun run lint       # Zero errors
  bun run build      # All pages generate successfully
  ```

---

### Phase 8: Playwright Tests (FINAL - May Block)

> **WHY**: Playwright tests can hang or take a long time. Run them only after all implementation is complete.
> **WARNING**: These tests may block the build loop. Run manually if loop times out.

- [ ] **8.1** Add Playwright tests for terminal sidebar
  - Create `packages/web/tests/terminal-sidebar.spec.ts`
  - Test: Toggle button opens sidebar
  - Test: Close button closes sidebar
  - Test: Sidebar persists across step navigation
  - Test: TryIt button opens sidebar and sends command
  - Test: Keyboard shortcut `t` toggles terminal
  - Test: Escape closes sidebar
  - Test: Focus returns to trigger on close

- [ ] **8.2** Add mobile bottom sheet tests
  - Test: Bottom sheet shows on mobile viewport
  - Test: Swipe down closes sheet (if gesture testable)
  - Test: All functionality works at 320px width

- [ ] **8.3** Run full Playwright test suite
  ```bash
  cd packages/web && bun run test
  ```
  - If tests hang, run with `--timeout=30000` flag
  - Consider running `bun run test:headed` for debugging

---

### Phase 9: Manual Verification (Post-Tests)

- [ ] **9.1** Desktop verification checklist
  - [ ] Toggle button visible in bottom-right
  - [ ] Click toggle opens sidebar from right
  - [ ] Terminal connects and shows prompt
  - [ ] TryIt components visible in MDX content
  - [ ] TryIt click opens sidebar and executes command
  - [ ] Navigate between steps, terminal stays connected
  - [ ] Close button closes sidebar
  - [ ] Focus returns to toggle button
  - [ ] `t` key toggles terminal
  - [ ] Escape closes sidebar

- [ ] **9.2** Mobile verification checklist (< 1024px)
  - [ ] Bottom sheet instead of sidebar
  - [ ] Drag handle visible
  - [ ] Touch targets >= 44px
  - [ ] All functionality works at 320px

- [ ] **9.3** Accessibility verification
  - [ ] Screen reader announces sidebar open/close
  - [ ] Focus trap works correctly
  - [ ] Keyboard navigation complete
  - [ ] Works with `prefers-reduced-motion`

---

## File Summary

### New Files (10)

| File | Purpose |
|------|---------|
| `tests/content.test.ts` | Content loading unit tests (Bun) |
| `contexts/TerminalContext.tsx` | Context for terminal state |
| `components/TerminalProvider.tsx` | Provider managing terminal lifecycle |
| `components/ui/TerminalSidebar.tsx` | Desktop sidebar component |
| `components/ui/MobileBottomSheet.tsx` | Mobile bottom sheet component |
| `components/ui/TerminalToggle.tsx` | FAB toggle button |
| `components/ui/TryIt.tsx` | MDX command execution component |
| `tests/terminal-sidebar.spec.ts` | Playwright tests (Phase 8) |

### Modified Files (10)

| File | Changes |
|------|---------|
| `packages/sandbox-api/tsconfig.json` | Extend `@hmemcpy/tutor-config/tsconfig.library.json` instead of `../../tsconfig.json` |
| `packages/sandbox-api/package.json` | Add `@hmemcpy/tutor-config` as devDependency |
| `packages/web/app/globals.css` | Add sidebar design tokens (--sidebar-width, z-index, transitions) |
| `packages/web/components/Providers.tsx` | Wrap children with TerminalProvider |
| `packages/web/app/[toolPair]/layout.tsx` | Render TerminalSidebar and TerminalToggle at layout level |
| `packages/web/components/ui/InteractiveTerminal.tsx` | Add onStateChange, onSessionTimeChange callback props |
| `packages/web/components/ui/StepPageClientWrapper.tsx` | Remove terminal section, suggestedCommands prop |
| `packages/web/app/[toolPair]/[step]/page.tsx` | Import centralized mdxComponents, remove local definition and unused imports |
| `packages/web/hooks/useKeyboardNavigation.ts` | Add `t` shortcut for terminal toggle |
| `packages/web/components/mdx/MDXComponents.tsx` | Register TryIt component |

### Deleted Files (3)

| File | Reason |
|------|--------|
| `components/ui/TerminalWithSuggestionsWrapper.tsx` | Replaced by TryIt + sidebar |
| `components/ui/TerminalWithSuggestions.tsx` | Replaced by TryIt + sidebar |
| `components/ui/CommandSuggestions.tsx` | Replaced by TryIt component |

---

## Execution Notes

- **Start with Phase 0** - Complete tutor migration before terminal sidebar work
- **Phase 0.5 is a bug fix** - Step page uses wrong SideBySide variant (discovered in gap analysis)
- **Validation command** (use throughout): `bun run typecheck && bun run lint && bun run build`
- **Playwright tests LAST** - Phase 8 runs only after all implementation is complete
- **Dev server**: `bun run --cwd packages/web dev`
- Follow existing patterns from DirectionContext for context creation
- Follow existing patterns from InteractiveTerminal for terminal handling
- Lazy load all terminal-related components to avoid bundle bloat

## Task Count

- Phase 0: 3 tasks (Tutor Migration)
- Phase 0.5: 2 tasks (MDX Cleanup - Bug Fix)
- Phase 1: 4 tasks (Foundation)
- Phase 2: 3 tasks (Sidebar UI)
- Phase 3: 3 tasks (Layout)
- Phase 4: 2 tasks (TryIt)
- Phase 5: 2 tasks (Keyboard)
- Phase 6: 4 tasks (Cleanup)
- Phase 7: 1 task (Build Validation)
- Phase 8: 3 tasks (Playwright Tests - FINAL)
- Phase 9: 3 tasks (Manual Verification)
- **Total: 30 tasks**

## Priority Summary

| Priority | Phase | Description |
|----------|-------|-------------|
| P0 | 0, 0.5 | Tutor migration + MDX bug fix (foundation) |
| P1 | 1-6 | Terminal sidebar implementation |
| P2 | 7-9 | Validation and testing |

---

## Bug Fixes Discovered

### 2026-01-22: Frontmatter Schema Empty Array Validation (Fixed)

**Issue**: Step 12 content has `gitCommands: []` and `jjCommands: []` in frontmatter, but the schema required `.min(1)` on optional array fields, causing build failure.

**Fix**: Removed `.min(1)` constraints from `gitCommands` and `jjCommands` in `packages/web/lib/content/schemas.ts`. Empty arrays are now valid.

**Files Changed**:
- `packages/web/lib/content/schemas.ts`
