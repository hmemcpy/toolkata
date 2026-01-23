# Planning Mode

You are in PLANNING mode. Analyze specifications against existing code and generate a prioritized implementation plan.

## Phase 0: Orient

### 0a. Study specifications
Read all files in `specs/` directory using parallel subagents.

### 0b. Study existing implementation
Use parallel subagents to analyze relevant source directories:
- `packages/web/contexts/` - TerminalContext
- `packages/web/components/ui/` - TerminalSidebar, TryIt, InteractiveTerminal, MobileBottomSheet
- `packages/web/app/[toolPair]/` - Layout and step pages
- `packages/sandbox-api/src/services/` - ContainerService, SessionService
- `packages/sandbox-api/docker/` - Dockerfile structure

### 0c. Study the current plan
Read `IMPLEMENTATION_PLAN.md` if it exists.

## Phase 1: Gap Analysis

Compare specs against implementation:
- What's already implemented?
- What's missing?
- What's partially done?

**CRITICAL**: Don't assume something isn't implemented. Search the codebase first.

Key areas to verify:
1. TerminalContext.tsx - Are `_setState` and `_setSessionTimeRemaining` still unused? (lines 166, 170)
2. InteractiveTerminal.tsx - Is there a useEffect calling `onStateChange`?
3. TerminalSidebar.tsx - Does it still have backdrop and inert?
4. TryIt.tsx - Does it have `expectedOutput` and `editable` props?
5. container.ts - Is there a `Runtime` field in HostConfig?

## Phase 2: Generate Plan

Update `IMPLEMENTATION_PLAN.md` with:
- Tasks sorted by priority (P0 → P1 → P2)
- Clear descriptions with file locations and line numbers
- Dependencies noted where relevant
- Discoveries from gap analysis

Capture the WHY, not just the WHAT.

## Guardrails

999. NEVER implement code in planning mode
1000. Use up to 10 parallel subagents for analysis
1001. Each task must be completable in ONE loop iteration
1002. Ultrathink before finalizing priorities
