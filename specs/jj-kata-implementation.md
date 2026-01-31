# JJ Kata Implementation Specification

## Overview

JJ Kata is a hands-on practice environment for jj (Jujutsu) that extends the existing 12-step tutorial. Upon completing Step 12, users are offered Kata as a graduation step to cement their learning through auto-validated, scenario-based exercises.

## Requirements

### R1: Graduation Integration (Step 12 → Kata)

Connect Step 12 completion to Kata introduction.

**Acceptance Criteria:**
- Step 12 content ends with a Kata CTA section (not a "Return to beginning" link)
- CTA clearly explains what Kata is and why users should do it
- Button links to `/jj-git/kata` landing page
- Only shows if user has completed all 12 steps
- Overview page shows "Start Kata Practice" button prominently after Step 12 completion

### R2: Kata Landing Page

Create `/[toolPair]/kata` route showing all Katas with progress.

**Acceptance Criteria:**
- Shows all 7 Katas in a vertical list
- Each Kata card shows: number, title, description, status
- Status: locked (gray), unlocked (active), completed (checkmark)
- Completed Katas show stats: attempts count, completion date
- Locked Katas show preview but are disabled
- Unlocked Katas have prominent "Start" button
- Progress indicator at top: "X/7 Katas completed"
- Empty state for users who haven't completed Step 12 yet

**Kata List:**
1. The Basics (Warm-up) - 5-7 min
2. The @ Commit Dojo - 10 min
3. Bookmarks Mastery - 12 min
4. Conflict Dojo - 15 min
5. Time Travel Master - 10 min
6. History Sculpting - 15 min
7. The Full Flow Challenge - 20 min

### R3: Kata Session Interface

Individual Kata practice page at `/[toolPair]/kata/[kataId]`.

**Acceptance Criteria:**
- Header shows: Kata number, title, progress within Kata, attempt counter
- Scenario section at top explains the context
- Exercises shown in sequence, completed ones marked
- Current exercise is highlighted
- TryIt components for command execution
- "Validate My Solution" button for current exercise
- Terminal sidebar works normally (shared with tutorial)
- "Reset Sandbox" button available
- Exit/return to Kata landing available
- Keyboard shortcut: `Esc` to exit to landing

### R4: Git Equivalent Toggle

Global toggle to show/hide git command comparisons.

**Acceptance Criteria:**
- Toggle button in Kata session header (icon: git-branch or eye)
- State stored in TerminalContext (global across all Katas)
- Default: HIDDEN (immersion-first approach)
- When hidden: only jj commands visible
- When shown: SideBySide components display both columns
- Toggle persists across sessions (localStorage)
- Label clearly indicates current state

### R5: Exercise Validation System

Auto-validate user solutions by parsing terminal state.

**Acceptance Criteria:**
- Each exercise has validation criteria (expected state)
- Validation runs terminal commands to check state
- Success: Green checkmark, "Exercise complete" message
- Failure: Red X, helpful hint about what's wrong
- Validation is async (shows loading spinner)
- Validation doesn't affect user's terminal session
- Multiple validation attempts tracked (for accuracy)

**Validation Methods:**
- Parse `jj log` output to count commits
- Parse `jj status` to check working copy state
- Parse `jj show` to verify commit messages
- Parse `jj branch list` to check bookmarks
- Check file existence/content via `cat` or `ls`

### R6: Progressive Unlock

Enforce strict ordering: complete Kata N to unlock Kata N+1.

**Acceptance Criteria:**
- Kata 1 unlocked after completing Step 12
- Kata N+1 unlocks only when Kata N is completed
- Locked Katas show: title, description, "Complete previous Kata to unlock"
- Direct URL access to locked Kata redirects to landing with message
- Unlock state saved in localStorage
- Unlock persists across browser sessions

### R7: Accuracy Tracking

Track attempts per Kata for future leaderboard.

**Acceptance Criteria:**
- Count validation attempts (not command executions)
- Store attempts per Kata in localStorage
- Show attempt count in real-time during Kata
- Show best attempt count on landing page for completed Katas
- Lower attempts = better (accuracy metric)
- Attempts persist across sessions

### R8: Content Structure

MDX-based Kata content with validation frontmatter.

**Acceptance Criteria:**
- Each Kata is an MDX file in `content/katas/jj-git/`
- Frontmatter includes: title, kata number, duration, focus area
- Exercises defined with validation criteria
- Uses TryIt component for commands
- Uses SideBySide with git equivalents (toggle-controlled)
- Standard MDX components available (Callout, etc.)

### R9: Terminal Output Parsing

Parse terminal output to validate exercise completion.

**Acceptance Criteria:**
- Execute validation commands without affecting user session
- Parse common jj output formats reliably
- Handle edge cases (empty output, errors, ANSI codes)
- Support regex pattern matching for flexible validation
- Support exact string matching for precise validation
- Support count-based validation ("at least 3 commits")

### R10: Future Leaderboard Support

Design for future logged-in user leaderboard.

**Acceptance Criteria:**
- localStorage structure compatible with future DB schema
- Anonymous mode works fully (no login required)
- Data structure supports: userId, kataId, attempts, timestamp, rank
- Easy migration path from localStorage to database
- Rank calculation: lower attempts = higher rank
- Tiebreaker: earlier completion date

## Constraints

### Design Philosophy

- **Minimal celebration**: No confetti, no animations. Surgical precision.
- **Terminology**: Use "bookmarks" exclusively (jj's new term, not "branches")
- **Immersion-first**: Git equivalents hidden by default
- **Progressive**: Strict unlock order maintains learning momentum

### Performance

- Kata landing page loads in < 1s (static + localStorage)
- Validation completes in < 2s (terminal round-trip)
- No blocking operations during Kata session

### Accessibility

- All interactive elements keyboard accessible
- Validation feedback announced to screen readers
- Attempt counter visible and readable
- Toggle button has clear aria-label

### Data Privacy

- All progress stored locally (localStorage)
- No user identification in anonymous mode
- Future opt-in for leaderboard (explicit consent)

### Content

- Use "bookmarks" not "branches" throughout
- Assume user knows git (no basic VCS concepts)
- Focus on jj-specific differences
- Include practical, real-world scenarios

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| User accesses locked Kata directly | Redirect to landing with "Complete previous Kata first" message |
| User resets terminal mid-exercise | Preserve exercise progress, allow re-validate |
| Validation hangs | Timeout after 5s, show "Try again" message |
| User completes exercise but validation fails | Show detailed hint, allow multiple re-attempts |
| User clears localStorage | All progress lost, Katas reset to initial state |
| User opens Kata in multiple tabs | Sync attempt count via storage event (best effort) |
| Terminal disconnects during validation | Queue validation, retry on reconnect |
| User manually edits validation command | Validation still works (checks actual state) |
| Exercise has multiple valid solutions | Validation accepts any valid solution |
| User completes all Katas | Show "All Katas completed" on landing, encourage real-world use |
| Step 12 not completed yet | Landing page shows "Complete the tutorial first" CTA |
| Git toggle changed mid-Kata | Immediately show/hide git equivalents in SideBySide |
| Mobile viewport | SideBySide stacks vertically (existing behavior) |
| Private browsing mode | Works but progress not persisted across sessions |
| Validation false positive | Rare edge case, user can reset and retry |

## Out of Scope

- Social features (sharing, commenting) beyond future leaderboard
- Kata difficulty levels (all Katas required)
- Hint system beyond validation failure hints
- Time limits on Katas (self-paced only)
- Partial Kata credit (all exercises required)
- Pre-built solutions or "show answer" feature
- Kata authoring interface (content is MDX files)
- Video/audio content in Katas
- Multiplayer or collaborative Katas
- Gamification beyond accuracy tracking (no badges, points, levels)

## Technical Notes

### State Management

- Extend TerminalContext with `showGitEquivalents` boolean
- New KataProgressContext for Kata-specific state
- localStorage keys: `toolkata-kata-progress`, `toolkata-git-toggle`

### Components to Build

1. **KataLanding** - Grid of Kata cards with lock/unlock states
2. **KataSession** - Exercise interface with progress
3. **ExerciseValidator** - Validation logic and feedback UI
4. **GitToggle** - Global toggle button component
5. **ValidationFeedback** - Success/failure/hint display
6. **KataProgressBar** - X/7 completion indicator
7. **AttemptCounter** - Real-time attempt tracking display

### Content Files

Create 7 MDX files in `packages/web/content/katas/jj-git/`:

1. **01-basics.mdx**: Warm-up - status, log, describe, new
2. **02-at-commit.mdx**: @ navigation, auto-rebasing, edit
3. **03-bookmarks.mdx**: Bookmark create/set/delete vs git branch
4. **04-conflicts.mdx**: First-class conflicts, resolve, rebase conflicts
5. **05-time-travel.mdx**: Operation log, op undo, op restore
6. **06-history.mdx**: Squash, split, diffedit, rebase
7. **07-full-flow.mdx**: End-to-end scenario (open-ended)

### Integration Points

- **Step 12**: Replace "Return to beginning" with Kata CTA
- **Overview page**: Add "Kata Practice" section after Step 12 completion
- **Navigation**: Add "Kata" link in main nav (visible only for jj-git)
- **Progress tracking**: Separate from tutorial progress (new context)

### Dependencies

- Reuse: TryIt, InteractiveTerminal, SideBySide, TerminalContext
- New: Kata content loader, validation engine, progress tracker
- No new external libraries needed
