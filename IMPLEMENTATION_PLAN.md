# Implementation Plan: JJ Kata Feature

> **Scope**: Extension of existing tutorial | **Risk**: Balanced | **Validation**: Existing test suite

## Summary

Extend the toolkata platform with a JJ Kata practice system that activates after Step 12 completion. Build a progressive unlock system with 7 scenario-based exercises, auto-validation, accuracy tracking, and git equivalent toggle. Reuse existing terminal infrastructure and MDX content system.

---

## Gap Analysis

### What's Already Implemented

1. **Terminal Infrastructure** (`contexts/TerminalContext.tsx`)
   - Complete terminal state management with sidebar/bottom sheet
   - Command execution via `executeCommand()`
   - Session management with WebSocket
   - localStorage persistence for sidebar state, width, info panel settings
   - **VERIFIED**: File exists at `packages/web/contexts/TerminalContext.tsx`

2. **SideBySide Component** (`components/ui/SideBySide.tsx`)
   - Two-column command comparison (git vs jj)
   - Responsive layout (stacks on mobile)
   - Color-coded columns (orange for git, green for jj)
   - **VERIFIED**: File exists, clean props interface
   - **MISSING**: Git toggle support (no `showGitEquivalents` prop or context integration)

3. **Content Loading** (`services/content.ts`)
   - `loadStep()`, `loadIndex()`, `listSteps()` functions
   - Effect-TS based with proper error handling
   - Extensible content type system via `defineContentType()`
   - Schema validation with Zod
   - **VERIFIED**: File exists, robust architecture
   - **MISSING**: Kata-specific loading functions

4. **Progress System** (`core/ProgressStore.ts`, `hooks/useStepProgress.ts`)
   - localStorage-based step progress tracking with schema versioning
   - Cookie-based SSR hydration
   - `ToolPairProgress` interface with `completedSteps`, `currentStep`, `lastVisited`
   - **VERIFIED**: Files exist, well-structured
   - **MISSING**: Kata progress tracking (separate from step progress)

5. **Route Structure** (`app/[toolPair]/`)
   - Dynamic routes for tool pairs
   - Step pages with MDX rendering at `app/[toolPair]/[step]/page.tsx`
   - Overview page at `app/[toolPair]/page.tsx`
   - Glossary page at `app/[toolPair]/glossary/page.tsx`
   - **VERIFIED**: Next.js App Router structure confirmed
   - **MISSING**: Kata routes (`/kata`, `/kata/[kataId]`)

6. **Content Directory Structure**
   - `content/comparisons/jj-git/` - 12 steps exist
   - `content/comparisons/zio-cats/` - 15 steps exist
   - `content/comparisons/effect-zio/` - 15 steps exist
   - **VERIFIED**: `ls packages/web/content/` shows comparisons/, glossary/, pairings.ts
   - **MISSING**: `content/katas/` directory doesn't exist

7. **Step 12 Content** (`content/comparisons/jj-git/12-step.mdx`)
   - Has "Return to beginning" link at end
   - **MISSING**: Kata CTA section

8. **Overview Page** (`app/[toolPair]/page.tsx`)
   - Progress tracking display
   - Step list with sections
   - **MISSING**: Kata section after Step 12 completion

---

## Tasks

### P0: Foundation & State Management

- [x] **P0.1: Extend TerminalContext with git toggle**
  - Add `showGitEquivalents: boolean` to TerminalContext state
  - Add `setShowGitEquivalents: (value: boolean) => void` action
  - Persist to localStorage key `toolkata-git-toggle`
  - Default to `false` (hidden by default per spec)
  - File: `packages/web/contexts/TerminalContext.tsx`

- [x] **P0.2: Create KataProgressContext**
  - Create new context for Kata-specific state management
  - Define `KataProgress` interface matching spec R6/R7
  - Include: `completedKatas: string[]`, `kataStats: Record<string, KataStat>`
  - Persist to localStorage key `toolkata-kata-progress`
  - Generate UUID for anonymous user ID (future leaderboard support)
  - File: `packages/web/contexts/KataProgressContext.tsx`
  - **Implemented**: Full context with `isKataUnlocked`, `startKata`, `recordAttempt`,
    `completeExercise`, `completeKata`, `resetKata`, `resetAll` methods
  - **Note**: Added `exerciseAttempts: Record<string, number>` to `KataStat` for per-exercise tracking

- [x] **P0.3: Create kata content loader**
  - Extend ContentService to load Kata MDX files
  - Create `loadKata(toolPair: string, kataId: string)` function
  - Create `listKatas(toolPair: string)` function to load all katas
  - Define `KataType` content type with path resolver
  - Parse Kata frontmatter (title, kata number, duration, focus, exercises)
  - File: `packages/web/services/content.ts` (extend existing)
  - File: `packages/web/lib/content/types.ts` (add KataType)
  - File: `packages/web/lib/content/schemas.ts` (add kataFrontmatterSchema)
  - **Implemented**: Added `kataFrontmatterSchema`, `exerciseSchema`, `exerciseValidationSchema`
  - **Implemented**: Added `KataType` with path resolver to `content/types.ts`
  - **Implemented**: Added `loadKata()` and `listKatas()` helper functions to `services/content.ts`

- [x] **P0.4: Update SideBySide for git toggle**
  - Read `showGitEquivalents` from TerminalContext via hook
  - When `false`: render only jj column (full width)
  - When `true`: render both columns (existing behavior)
  - Respect prop override if explicitly passed
  - File: `packages/web/components/ui/SideBySide.tsx`

### P1: Kata Landing Page

- [x] **P1.1: Create KataLanding component**
  - Display "X/7 Katas completed" progress indicator at top
  - Render 7 Kata cards in vertical list
  - Each card: number, title, description, status icon
  - Status: locked (gray lock), unlocked (green play), completed (checkmark)
  - Completed cards show attempts count and completion date
  - Locked cards show "Complete previous Kata to unlock" message
  - Unlocked cards have prominent "Start" button linking to session
  - Empty state for users who haven't completed Step 12
  - File: `packages/web/components/kata/KataLanding.tsx`
  - **Implemented**: Full component with KataCard and KataLanding exports
  - **Note**: All SVGs have proper aria-labels/title for accessibility

- [x] **P1.2: Create /[toolPair]/kata route**
  - Create `app/[toolPair]/kata/page.tsx`
  - Load all Katas via content service
  - Read progress from server-side cookie (Step 12 completion check)
  - Render KataLanding component
  - Handle empty state when tool pair has no Katas
  - Add metadata (title, description)
  - **Implemented**: Full page with generateStaticParams, generateMetadata, back link
  - **Note**: Uses `listKatas()` from content service, maps kataId from frontmatter.kata

- [x] **P1.3: Add Kata link to navigation**
  - Add "Kata" link in main navigation
  - Only visible for jj-git tool pair
  - Show lock icon if Step 12 not complete
  - File: `packages/web/components/ui/Navigation.tsx` (or NavigationWrapper)
  - **Implemented**: Added [Kata] link to StepProgress.tsx next to [Glossary]
  - Uses `useStepProgress` hook to check if Step 12 is complete
  - Shows lock icon SVG when Step 12 not complete
  - Only renders for toolPair === "jj-git"

### P2: Kata Session Interface

- [x] **P2.1: Create KataSession component**
  - Header: Kata number, title, timer, attempt counter
  - Progress bar showing exercise completion within Kata
  - Scenario section at top (collapsible)
  - Exercise list with current exercise highlighted
  - Render MDX content for current exercise
  - "Validate My Solution" button
  - "Reset Sandbox" button
  - Exit button (returns to landing)
  - Keyboard shortcut: `Esc` to exit
  - File: `packages/web/components/kata/KataSession.tsx`
  - **Implemented**: Full component with validation state, progress tracking, timer,
    exercise navigation, locked state handling, and session management
  - **Note**: Reset Sandbox button has placeholder TODO (will integrate with
    validation system in P3.1)

- [x] **P2.2: Create GitToggle component**
  - Button with git-branch icon
  - Label: "Show git equivalent" / "Hide git equivalent"
  - Toggle state via TerminalContext
  - Clear visual indication of current state
  - File: `packages/web/components/kata/GitToggle.tsx`
  - **Implemented**: Full component with git-branch SVG icon, ON/OFF indicator,
    aria-pressed for accessibility, proper focus ring styling

- [x] **P2.3: Create ValidationFeedback component**
  - Success state: Green checkmark, "Exercise complete" message
  - Failure state: Red X, helpful hint text
  - Loading state: Spinner during validation
  - Accessible (aria-live region for screen readers)
  - File: `packages/web/components/kata/ValidationFeedback.tsx`
  - **Implemented**: Full component with ValidationState type export, customizable messages,
    proper accessibility (role="status", aria-live="polite"), terminal aesthetic styling
  - **Refactored**: KataSession now uses ValidationFeedback component instead of inline rendering

- [x] **P2.4: Create /[toolPair]/kata/[kataId] route**
  - Create `app/[toolPair]/kata/[kataId]/page.tsx`
  - Load specific Kata content via content service
  - Client-side component handles unlock redirect via KataProgressContext (not server-side)
  - Render KataSession component with MDX content
  - Handle 404 for invalid kataId
  - **Note**: Server-side redirect not implemented since kata progress is in localStorage, not cookie
  - **Implemented**: Full page with generateStaticParams, generateMetadata, MDX rendering

### P3: Validation System

- [x] **P3.1: Create validation engine**
  - Create `validateExercise(exercise: Exercise, terminal: TerminalState): Promise<ValidationResult>`
  - Support validation types: command, regex, exact, count
  - Execute validation commands via sandbox API
  - Parse terminal output (strip ANSI codes)
  - Return structured result: success, hint, actual output
  - File: `packages/web/services/kata-validation.ts`
  - **Completed**: Full validation engine with WebSocket execution, 4 validation types

- [x] **P3.2: Implement validation parsers**
  - `parseJjLog(output: string): Commit[]` - parse commit list
  - `parseJjStatus(output: string): Status` - parse working copy state
  - `parseJjShow(output: string): CommitInfo` - parse commit details
  - `parseJjBranchList(output: string): Bookmark[]` - parse bookmarks
  - File: `packages/web/lib/kata/parsers.ts`
  - **Completed**: All 4 parsers implemented with ANSI stripping

- [x] **P3.3: Integrate validation into KataSession**
  - Wire "Validate My Solution" button to validation engine
  - Show ValidationFeedback component with results
  - On success: mark exercise complete, enable next exercise
  - Track validation attempts in KataProgressContext
  - On final exercise completion: unlock next Kata
  - **Completed**: Validation integrated with sessionId from TerminalContext

### P4: Graduation Integration

- [x] **P4.1: Update Step 12 with Kata CTA**
  - Replace "Return to beginning" link with Kata CTA section
  - Add heading "Tutorial Complete"
  - Add explanatory text about Kata
  - Add "Start Your First Kata" button linking to `/jj-git/kata`
  - Only show if all 12 steps completed
  - File: `packages/web/content/comparisons/jj-git/12-step.mdx`
  - **Implemented**: Created `KataCTA` component with conditional rendering based on step completion
  - **Note**: Component uses `useStepProgress` hook to check if all 12 steps are complete
  - **Files**: `packages/web/components/kata/KataCTA.tsx`, `components/mdx/MDXComponents.tsx`

- [ ] **P4.2: Update Overview page with Kata section**
  - Add "Kata Practice" section after Step 12 completion
  - Show "Start Kata Practice" button prominently
  - Show progress indicator (X/7 completed)
  - File: `packages/web/app/[toolPair]/page.tsx`

### P5: Content Creation

- [ ] **P5.1: Create Kata 1 - The Basics**
  - File: `packages/web/content/katas/jj-git/01-basics.mdx`
  - 3-4 exercises covering: status, log, describe, new
  - Duration: 5-7 min
  - Include validation frontmatter for each exercise

- [ ] **P5.2: Create Kata 2 - The @ Commit Dojo**
  - File: `packages/web/content/katas/jj-git/02-at-commit.mdx`
  - 4-5 exercises covering: @ navigation, auto-rebasing, edit
  - Duration: 10 min
  - Include validation frontmatter

- [ ] **P5.3: Create Kata 3 - Bookmarks Mastery**
  - File: `packages/web/content/katas/jj-git/03-bookmarks.mdx`
  - 4-5 exercises covering: bookmark create/set/delete
  - Duration: 12 min
  - Include validation frontmatter

- [ ] **P5.4: Create Kata 4 - Conflict Dojo**
  - File: `packages/web/content/katas/jj-git/04-conflicts.mdx`
  - 4-5 exercises covering: first-class conflicts, resolve, rebase conflicts
  - Duration: 15 min
  - Include validation frontmatter

- [ ] **P5.5: Create Kata 5 - Time Travel Master**
  - File: `packages/web/content/katas/jj-git/05-time-travel.mdx`
  - 3-4 exercises covering: operation log, op undo, op restore
  - Duration: 10 min
  - Include validation frontmatter

- [ ] **P5.6: Create Kata 6 - History Sculpting**
  - File: `packages/web/content/katas/jj-git/06-history.mdx`
  - 4-5 exercises covering: squash, split, diffedit, rebase
  - Duration: 15 min
  - Include validation frontmatter

- [ ] **P5.7: Create Kata 7 - The Full Flow Challenge**
  - File: `packages/web/content/katas/jj-git/07-full-flow.mdx`
  - Open-ended scenario requiring multiple techniques
  - Duration: 20 min
  - Include validation frontmatter

### P6: Polish & Edge Cases

- [ ] **P6.1: Handle locked Kata direct access**
  - Middleware or page-level check for Kata access
  - Redirect to landing with toast/flash message
  - Message: "Complete previous Kata to unlock"
  - File: `packages/web/app/[toolPair]/kata/[kataId]/page.tsx`

- [ ] **P6.2: Add validation timeout handling**
  - 5-second timeout on validation commands
  - Show "Try again" message on timeout
  - Allow retry without counting as attempt
  - File: `packages/web/services/kata-validation.ts`

- [ ] **P6.3: Handle terminal reset during exercise**
  - Preserve exercise progress in KataProgressContext
  - Allow re-validation after reset
  - Don't reset attempt counter on terminal reset

- [ ] **P6.4: Sync across multiple tabs**
  - Listen for `storage` events on localStorage
  - Sync attempt count and progress across tabs
  - Best effort (don't block on sync)
  - File: `packages/web/contexts/KataProgressContext.tsx`

- [ ] **P6.5: All Katas completed state**
  - Special message on landing when all 7 complete
  - Encourage real-world jj usage
  - Show final stats (total attempts, total time)
  - File: `packages/web/components/kata/KataLanding.tsx`

---

## Dependencies

```
P0.1 (TerminalContext) ────────────────────┐
                                           │
P0.2 (KataProgressContext) ─────────────────┼──► P1.1 (KataLanding) ──► P1.2 (Route)
                                           │         │
P0.3 (Content Loader) ─────────────────────┤         │
                                           │         ▼
P0.4 (SideBySide) ─────────────────────────┘    P2.1 (KataSession) ──► P2.4 (Route)
                                                        │
P2.2 (GitToggle) ◄──────────────────────────────────────┤
                                                        │
P2.3 (ValidationFeedback) ◄─────────────────────────────┤
                                                        │
P3.1 (Validation Engine) ◄──────────────────────────────┤
     │                                                  │
     ▼                                                  ▼
P3.2 (Parsers) ───────────────────────────────────► P3.3 (Integration)
                                                           │
P4.1 (Step 12 CTA) ◄───────────────────────────────────────┤
                                                           │
P4.2 (Overview CTA) ◄──────────────────────────────────────┤
                                                           │
P5.1-P5.7 (Content) ◄──────────────────────────────────────┘
```

---

## File Structure

```
packages/web/
├── app/
│   └── [toolPair]/
│       ├── kata/
│       │   ├── page.tsx              # P1.2: Landing page
│       │   └── [kataId]/
│       │       └── page.tsx          # P2.4: Session page
│       └── page.tsx                  # P4.2: Overview (update)
├── components/
│   ├── kata/
│   │   ├── KataLanding.tsx           # P1.1
│   │   ├── KataSession.tsx           # P2.1
│   │   ├── GitToggle.tsx             # P2.2
│   │   └── ValidationFeedback.tsx    # P2.3
│   └── ui/
│       ├── SideBySide.tsx            # P0.4 (update)
│       └── Navigation.tsx            # P1.3 (update)
├── contexts/
│   ├── TerminalContext.tsx           # P0.1 (extend)
│   └── KataProgressContext.tsx       # P0.2
├── services/
│   ├── content.ts                    # P0.3 (extend)
│   └── kata-validation.ts            # P3.1
├── lib/
│   ├── content/
│   │   ├── types.ts                  # P0.3 (add KataType)
│   │   └── schemas.ts                # P0.3 (add kata schema)
│   └── kata/
│       └── parsers.ts                # P3.2
└── content/
    └── katas/
        └── jj-git/
            ├── 01-basics.mdx         # P5.1
            ├── 02-at-commit.mdx      # P5.2
            ├── 03-bookmarks.mdx      # P5.3
            ├── 04-conflicts.mdx      # P5.4
            ├── 05-time-travel.mdx    # P5.5
            ├── 06-history.mdx        # P5.6
            └── 07-full-flow.mdx      # P5.7
```

---

## Data Models

### KataProgress Interface

```typescript
interface KataProgress {
  completedKatas: string[]  // ["1", "2", ...]
  currentKata?: string
  kataStats: Record<string, KataStat>
}

interface KataStat {
  completedAt: string  // ISO timestamp
  attempts: number     // Validation attempts before success
  exercisesCompleted: string[]  // ["1.1", "1.2", ...]
}
```

### Kata Frontmatter Schema

```typescript
interface KataFrontmatter {
  title: string
  kata: number           // 1-7
  duration: string       // "10 min"
  focus: string          // Brief description of focus area
  exercises: Exercise[]
}

interface Exercise {
  id: string             // "2.1", "2.2", etc.
  title: string
  validation: {
    type: "command" | "regex" | "exact" | "count"
    command: string      // jj log, jj status, etc.
    expectedPattern?: string  // For regex type
    expectedValue?: string    // For exact type
    minCount?: number         // For count type
  }
}
```

---

## Validation Command

```bash
cd packages/web && bun run build && bun run typecheck && bun run lint
```

---

## Acceptance Criteria Summary

- [ ] Step 12 shows Kata CTA after completion (P4.1)
- [ ] Kata landing page shows 7 Katas with correct lock states (P1.1, P1.2)
- [ ] Katas unlock progressively (strict order) (P0.2, P6.1)
- [ ] Git equivalents toggle works globally (hidden by default) (P0.1, P0.4, P2.2)
- [ ] Validation system checks terminal state correctly (P3.1, P3.2, P3.3)
- [ ] Attempt count tracked and displayed (P0.2, P2.1)
- [ ] All 7 Kata content files created (P5.1-P5.7)
- [ ] Accuracy data structure ready for future leaderboard (P0.2)
- [ ] Mobile responsive design maintained (all components)
- [ ] Accessibility requirements met (aria labels, keyboard nav)
- [ ] Edge cases handled gracefully (P6.1-P6.5)

---

## Discovery Notes

### Existing Infrastructure Verification

| Component | Status | Location |
|-----------|--------|----------|
| TerminalContext | ✅ Exists | `packages/web/contexts/TerminalContext.tsx` |
| SideBySide | ✅ Exists | `packages/web/components/ui/SideBySide.tsx` |
| ContentService | ✅ Exists | `packages/web/services/content.ts` |
| ProgressStore | ✅ Exists | `packages/web/core/ProgressStore.ts` |
| useStepProgress | ✅ Exists | `packages/web/hooks/useStepProgress.ts` |
| Route structure | ✅ Exists | `app/[toolPair]/` pattern confirmed |
| MDX system | ✅ Exists | `lib/content-core/` with Effect-TS |
| Kata directory | ❌ Missing | `content/katas/` needs creation |

### Key Implementation Insights

1. **Content Loading**: The existing `defineContentType()` pattern makes adding KataType straightforward. Follow the same pattern as `StepType` in `lib/content/types.ts`.

2. **Progress Tracking**: The existing `ProgressStore` uses a singleton pattern with localStorage + cookie sync. Kata progress should follow similar patterns but remain separate (different localStorage key).

3. **TerminalContext**: Already has localStorage persistence for settings. Adding `showGitEquivalents` follows the same pattern as `sidebarWidth`, `infoPanelCollapsed`, etc.

4. **SideBySide**: Clean component with clear separation between columns. Adding conditional rendering for the left column is straightforward.

5. **Routes**: Next.js App Router with `[toolPair]` dynamic segment. New kata routes fit naturally as `app/[toolPair]/kata/` and `app/[toolPair]/kata/[kataId]/`.
