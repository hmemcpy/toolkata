# Planning Mode

You are in PLANNING mode. Analyze specifications against existing code and generate a prioritized implementation plan.

## Phase 0: Orient

### 0a. Study specifications
Read all files in `specs/` directory using parallel subagents.

### 0b. Study existing implementation
Use parallel subagents to analyze relevant source directories:
- `packages/web/components/ui/` - CodeBlock, ScalaComparisonBlock, ScastieEmbed
- `packages/web/app/[toolPair]/` - Dynamic routing and page structure
- `packages/web/content/comparisons/cats-zio/` - MDX content files (10 existing steps)
- `packages/web/content/glossary/` - Glossary data
- `packages/web/lib/content-core/` - Config loading (tool-config.ts)
- `packages/web/next.config.ts` - MDX and plugin configuration
- `/tmp/zionomicon/EPUB/text/` - Zionomicon chapters (extract ePub if needed)
- `specs/zionomicon-tutorial-update.md` - Primary specification for this work

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
- Clear descriptions with file locations
- Dependencies noted where relevant
- Discoveries from gap analysis

**CRITICAL: ALL tasks MUST use checkbox format:**
- `- [ ] **Task Name**` for pending tasks
- `- [x] **Task Name**` for completed tasks

Do NOT use other formats like `#### P1.1: Task Name` or `**Task Name**` without checkboxes. The build loop relies on `grep -c "^\- \[ \]"` to count remaining tasks.

Capture the WHY, not just the WHAT.

## Guardrails

999. NEVER implement code in planning mode
1000. Use up to 10 parallel subagents for analysis
1001. Each task must be completable in ONE loop iteration
1002. Ultrathink before finalizing priorities
1003. **ALWAYS use checkbox format `- [ ]` or `- [x]` for tasks in IMPLEMENTATION_PLAN.md** - The build loop relies on `grep -c "^\- \[ \]"` to count remaining tasks. Never use `####` headers or bold text without checkboxes.
