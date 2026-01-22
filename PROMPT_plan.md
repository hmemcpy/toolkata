# Planning Mode

You are in PLANNING mode. Analyze specifications against existing code and generate a prioritized implementation plan.

## Code Style Guidelines

All planned code must strictly follow these rules:
- No `any`, no `!` assertions, no `as` assertions
- Handle all index access (returns `T | undefined`)
- Explicit return types on exported functions
- `readonly` by default for all properties and parameters
- Use `import * as Option from "effect/Option"` (not `import { Option }`)
- Use `for...of` (not `forEach`)

---

## Phase 0: Orient

### 0a. Study specifications
Read all files in `specs/` directory using parallel subagents.

### 0b. Study existing implementation
Use parallel subagents to analyze relevant source directories:
- `packages/web/contexts/` - existing context patterns (DirectionContext)
- `packages/web/components/ui/` - existing UI components, especially InteractiveTerminal.tsx
- `packages/web/components/Providers.tsx` - how providers are composed
- `packages/web/app/[toolPair]/layout.tsx` - current layout structure
- `packages/web/hooks/useKeyboardNavigation.ts` - keyboard shortcut patterns
- `packages/web/components/ui/StepPageClientWrapper.tsx` - current terminal integration

### 0c. Study the current plan
Read `IMPLEMENTATION_PLAN.md` if it exists.

### 0d. Study code style guidelines
Review `CLAUDE.md` for coding standards that MUST be followed.

## Phase 1: Gap Analysis

Compare specs against implementation:
- What's already implemented?
- What's missing?
- What's partially done?

**CRITICAL**: Don't assume something isn't implemented. Search the codebase first.

Key questions to answer:
1. Does TerminalContext exist? What state does it manage?
2. Does TerminalSidebar exist? What UI does it provide?
3. Does TryIt MDX component exist? Is it registered?
4. Is the terminal currently embedded in step pages or in a sidebar?
5. Are keyboard shortcuts for terminal toggle implemented?

## Phase 2: Generate Plan

Update `IMPLEMENTATION_PLAN.md` with:
- Tasks sorted by priority (P0 → P1 → P2)
- Clear descriptions with file locations
- Dependencies noted where relevant
- Discoveries from gap analysis
- Ensure all tasks follow code style guidelines

Capture the WHY, not just the WHAT.

## Guardrails

999. NEVER implement code in planning mode
1000. Use up to 10 parallel subagents for analysis
1001. Each task must be completable in ONE loop iteration
1002. Ultrathink before finalizing priorities
1003. **All planned code MUST follow code style guidelines in CLAUDE.md**
