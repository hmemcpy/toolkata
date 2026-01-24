# Planning Mode

You are in PLANNING mode. Analyze specifications against existing code and generate a prioritized implementation plan.

## Phase 0: Orient

### 0a. Study specifications
Read all files in `specs/` directory using parallel subagents.

### 0b. Study existing implementation
Use parallel subagents to analyze relevant source directories:
- `packages/web/lib/content/` - Content loading and schemas
- `packages/web/services/` - Frontend services
- `packages/web/components/ui/InteractiveTerminal.tsx` - Terminal component
- `packages/sandbox-api/src/services/` - Backend services (container, session, websocket)
- `packages/sandbox-api/src/routes/` - API routes
- `packages/sandbox-api/docker/` - Docker infrastructure

### 0c. Study the current plan
Read `IMPLEMENTATION_PLAN.md` if it exists.

## Phase 1: Gap Analysis

Compare specs against implementation:
- What's already implemented?
- What's missing?
- What's partially done?

**CRITICAL**: Don't assume something isn't implemented. Search the codebase first.

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
