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

## Tasks

### Phase 0: Tutor Migration Completion

> **WHY**: Complete infrastructure cleanup before adding new features. Ensures consistent TypeScript strictness across packages.
> **Spec**: `specs/tutor-migration.md`

- [ ] **0.1** Update `packages/sandbox-api/tsconfig.json` to use tutor-config
  - Change `extends` from `../../tsconfig.json` to `@hmemcpy/tutor-config/tsconfig.library.json`
  - Keep existing `outDir: "dist"` and `rootDir: "src"`
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

### Phase 1: Foundation (Context & State)

> **WHY**: Terminal sidebar requires shared state across components. Context pattern matches DirectionContext.
> **Spec**: `specs/terminal-sidebar.md`

- [ ] **1.1** Create `TerminalContext` at `packages/web/contexts/TerminalContext.tsx`
  - Define `TerminalState` type: IDLE | CONNECTING | CONNECTED | TIMEOUT_WARNING | EXPIRED | ERROR
  - Define `TerminalContextValue` interface with sidebar state, terminal ref, executeCommand()
  - Create context with `createContext` and `useTerminalContext()` hook
  - Throw helpful error if used outside provider

- [ ] **1.2** Create `TerminalProvider` at `packages/web/components/TerminalProvider.tsx`
  - Manage sidebar open/closed state
  - Hold ref to `InteractiveTerminalRef`
  - Implement `executeCommand()` that opens sidebar if closed, then calls insertCommand
  - Manage terminal state machine (subscribe to InteractiveTerminal state changes)
  - Track session time remaining
  - Focus management: auto-focus close button when sidebar opens

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

### Phase 2: Sidebar UI Components

- [ ] **2.1** Create `TerminalSidebar.tsx` at `packages/web/components/ui/TerminalSidebar.tsx`
  - Fixed right sidebar (desktop lg+)
  - 400px width, full height, overlay mode
  - Header: "Terminal" title, status indicator, close button
  - Body: Lazy-loaded InteractiveTerminal via dynamic import
  - Footer: Reset button, session timer
  - Accessibility: `aria-label`, `aria-hidden`, `id="terminal-sidebar"`
  - Focus trap implementation using inert on rest of page
  - Slide-in animation from right (transform + opacity)

- [ ] **2.2** Create `MobileBottomSheet.tsx` at `packages/web/components/ui/MobileBottomSheet.tsx`
  - Bottom sheet for viewports < lg (1024px)
  - ~60% viewport height, max 600px
  - Drag handle at top (24px)
  - Swipe-to-close gesture (100px threshold)
  - Same content as desktop sidebar (terminal, footer)
  - Accessibility: `role="dialog"`, `aria-modal="true"`, `aria-label`
  - Focus trap when open

- [ ] **2.3** Create `TerminalToggle.tsx` at `packages/web/components/ui/TerminalToggle.tsx`
  - FAB button in bottom-right corner
  - 56px touch target
  - Connection indicator dot (green when connected)
  - Hidden when sidebar open (desktop)
  - Accessibility: `aria-label`, `aria-expanded`, `aria-controls`
  - Keyboard: Enter/Space to toggle

### Phase 3: Layout Integration

- [ ] **3.1** Update `app/[toolPair]/layout.tsx` to render sidebar
  - Add `<TerminalSidebar />` at layout level (after children)
  - Add `<TerminalToggle />` at layout level
  - Sidebar renders via portal or direct in layout
  - Content maintains full width (sidebar overlays)

- [ ] **3.2** Update `InteractiveTerminal.tsx` with state change callback
  - Add `onStateChange?: (state: TerminalState) => void` prop
  - Call callback whenever internal state changes
  - Expose session time remaining via callback or ref

- [ ] **3.3** Remove terminal from StepPageClientWrapper
  - Remove `suggestedCommands` prop from StepPageClientWrapper
  - Remove `TerminalWithSuggestionsWrapper` from step page render
  - Remove "Try It Yourself" section heading
  - Clean up unused imports

### Phase 4: TryIt Component

- [ ] **4.1** Create `TryIt.tsx` at `packages/web/components/ui/TryIt.tsx`
  - Props: `command: string`, `description?: string`
  - Display command in monospace code block
  - Green "Run" button (min 44px height, min 80px width)
  - Optional description text below command
  - States: default, executing (brief "Sent" flash)
  - Accessibility: `aria-label={`Run command: ${command}`}`
  - Debounce clicks (500ms)
  - Calls `executeCommand()` from TerminalContext

- [ ] **4.2** Register TryIt in MDX components
  - Location: `packages/web/components/mdx/MDXComponents.tsx`
  - Add `TryIt` to component mapping
  - Test in step MDX file

### Phase 5: Keyboard Navigation

- [ ] **5.1** Add terminal keyboard shortcuts to `useKeyboardNavigation.ts`
  - Add `t` shortcut to toggle terminal
  - Ensure shortcuts don't fire when terminal input is focused
  - Location: `packages/web/hooks/useKeyboardNavigation.ts`

- [ ] **5.2** Add Esc handler to TerminalSidebar
  - Close sidebar on Escape key
  - Only when sidebar is open and focused
  - Return focus to toggle button or last TryIt clicked

### Phase 6: Cleanup

- [ ] **6.1** Update `app/[toolPair]/[step]/page.tsx`
  - Remove `suggestedCommands` extraction from frontmatter
  - Remove passing `suggestedCommands` to StepPageClientWrapper
  - Simplify step page props

- [ ] **6.2** Remove `TerminalWithSuggestionsWrapper.tsx`
  - Delete file: `packages/web/components/ui/TerminalWithSuggestionsWrapper.tsx`
  - Remove exports from any index files

- [ ] **6.3** Remove `TerminalWithSuggestions.tsx`
  - Delete file: `packages/web/components/ui/TerminalWithSuggestions.tsx`
  - Remove exports from any index files

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
| `specs/tutor-migration.md` | Tutor migration specification |
| `specs/terminal-sidebar.md` | Terminal sidebar specification |
| `tests/content.test.ts` | Content loading unit tests (Bun) |
| `contexts/TerminalContext.tsx` | Context for terminal state |
| `components/TerminalProvider.tsx` | Provider managing terminal lifecycle |
| `components/ui/TerminalSidebar.tsx` | Desktop sidebar component |
| `components/ui/MobileBottomSheet.tsx` | Mobile bottom sheet component |
| `components/ui/TerminalToggle.tsx` | FAB toggle button |
| `components/ui/TryIt.tsx` | MDX command execution component |
| `tests/terminal-sidebar.spec.ts` | Playwright tests (Phase 8) |

### Modified Files (9)

| File | Changes |
|------|---------|
| `packages/sandbox-api/tsconfig.json` | Extend tutor-config |
| `packages/sandbox-api/package.json` | Add tutor-config devDep |
| `app/globals.css` | Add sidebar design tokens |
| `components/Providers.tsx` | Add TerminalProvider |
| `app/[toolPair]/layout.tsx` | Render sidebar and toggle |
| `components/ui/InteractiveTerminal.tsx` | Add onStateChange prop |
| `components/ui/StepPageClientWrapper.tsx` | Remove terminal section |
| `app/[toolPair]/[step]/page.tsx` | Remove suggestedCommands |
| `hooks/useKeyboardNavigation.ts` | Add `t` shortcut |
| `components/mdx/MDXComponents.tsx` | Register TryIt |

### Deleted Files (2)

| File | Reason |
|------|--------|
| `components/ui/TerminalWithSuggestionsWrapper.tsx` | Replaced by TryIt + sidebar |
| `components/ui/TerminalWithSuggestions.tsx` | Replaced by TryIt + sidebar |

---

## Execution Notes

- **Start with Phase 0** - Complete tutor migration before terminal sidebar work
- **Validation command** (use throughout): `bun run typecheck && bun run lint && bun run build`
- **Playwright tests LAST** - Phase 8 runs only after all implementation is complete
- **Dev server**: `bun run --cwd packages/web dev`
- Follow existing patterns from DirectionContext for context creation
- Follow existing patterns from InteractiveTerminal for terminal handling
- Lazy load all terminal-related components to avoid bundle bloat

## Task Count

- Phase 0: 3 tasks (Tutor Migration)
- Phase 1: 4 tasks (Foundation)
- Phase 2: 3 tasks (Sidebar UI)
- Phase 3: 3 tasks (Layout)
- Phase 4: 2 tasks (TryIt)
- Phase 5: 2 tasks (Keyboard)
- Phase 6: 3 tasks (Cleanup)
- Phase 7: 1 task (Build Validation)
- Phase 8: 3 tasks (Playwright Tests - FINAL)
- Phase 9: 3 tasks (Manual Verification)
- **Total: 27 tasks**
