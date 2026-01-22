# Bidirectional Tool Comparison

> **Status**: Specification Ready
> **Priority**: P1 - Enhancement Feature
> **Estimated Effort**: Medium (7-10 files, 3-4 phases)

## Overview

Enable viewing tool comparisons in either direction (git→jj OR jj→git) with a persistent direction toggle and a new searchable glossary page.

## Target Users

- **Bilingual developers**: Use both tools, need quick reference in either direction
- **Professional jj users**: Forgot git equivalents, need reverse lookup
- **Git users exploring jj**: Want to see comparison from both perspectives

## User Stories

### Direction Toggle
- [ ] As a user, I can click a toggle in the header to swap comparison direction
- [ ] As a user, my direction preference persists across page refreshes
- [ ] As a user, my direction preference applies to all comparison pages (steps, cheatsheet, glossary)
- [ ] As a user, I see the SideBySide command comparisons swap columns when I toggle direction

### Glossary Page
- [ ] As a user, I can visit `/{toolPair}/glossary` to see a searchable command reference
- [ ] As a user, I can search commands by keyword and see filtered results
- [ ] As a user, I can filter by category (Basics, Commits, History, etc.)
- [ ] As a user, I can copy commands to clipboard
- [ ] As a user, the glossary respects my direction preference

### Accessibility
- [ ] As a keyboard user, I can toggle direction using Enter/Space
- [ ] As a screen reader user, the toggle announces direction state changes
- [ ] As a screen reader user, search results announce count changes

## Acceptance Criteria

### Direction Toggle
1. Toggle displays as `[git ↔ jj]` in terminal bracket style
2. Click swaps to `[jj ↔ git]` and updates all comparison components
3. Preference stored in `localStorage` under `toolkata_preferences`
4. On page load, reads preference and applies (default: git→jj)
5. Touch target >= 44px for mobile
6. Position: Header, next to tool pair name in StepProgress

### SideBySide Component
1. Accepts `isReversed?: boolean` prop
2. When reversed: jj column on left (green), git column on right (orange)
3. Semantic `fromCommands`/`toCommands` props unchanged (MDX content stays same)
4. Accessible table caption updates to reflect visual order

### Glossary Page
1. Route: `/{toolPair}/glossary`
2. Two-column table: "from" tool | "to" tool | notes
3. Search input filters across all columns
4. Category filter tabs: All, Basics, Commits, History, Branches, Remotes, Undo, Conflicts, Advanced
5. Copy button copies the command for the "to" tool (based on current direction)
6. Direction toggle in glossary header
7. Responsive: table scrolls horizontally on mobile

### Data Architecture
1. Glossary data extracted to `content/glossary/jj-git.ts`
2. Cheatsheet page imports from shared data source
3. Data structure supports future tool pairings (generic interface)

## Technical Constraints

### SSR Hydration
- Server renders with default direction (git→jj)
- Client reads localStorage in `useEffect` after mount
- Use `isLoading` state to avoid hydration mismatch
- No flash of wrong content (show default until hydrated)

### State Management
- New `PreferencesStore` class (follows `ProgressStore` pattern)
- New `useDirection` hook (follows `useStepProgress` pattern)
- Optional: React Context for cross-component access without prop drilling

### Accessibility Requirements
- Toggle: `role="switch"`, `aria-checked`, `aria-label`
- Search: `aria-live="polite"` for result announcements
- Table: proper `<table>` with `<th scope="col">` headers
- Keyboard: Enter/Space to toggle, focus visible

## Edge Cases

1. **localStorage unavailable**: Default to git→jj, no persistence
2. **Invalid stored preference**: Reset to default, don't crash
3. **Search with no results**: Show "No commands match" message
4. **Empty category filter**: Show all commands
5. **Tool pairing without glossary data**: Show "Glossary coming soon" message

## Out of Scope

- Per-tool-pair direction preferences (global preference applies to all)
- Animated toggle transition
- Keyboard shortcut for direction toggle (e.g., `D` key)
- URL parameter for direction (`?dir=reversed`) - considered but rejected for simplicity

## Dependencies

- Existing `ProgressStore` pattern for reference
- Existing `useStepProgress` hook for reference
- Existing cheatsheet data (`jjGitCheatSheet` array)
- Design tokens from `globals.css`

## Verification

### Automated Tests (Playwright)
1. Direction toggle click → preference persists after refresh
2. Direction toggle → SideBySide columns swap
3. Glossary search → results filter correctly
4. Glossary category filter → shows correct entries
5. All routes still load successfully

### Manual Testing
1. Mobile: toggle and glossary usable on 320px viewport
2. Print: glossary prints cleanly (hide search, show all)
3. Screen reader: toggle and search announce correctly
