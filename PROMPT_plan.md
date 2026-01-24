# Planning Mode: Cats Effect ↔ ZIO Comparison

You are in PLANNING mode. Analyze specifications and research Scala libraries to generate a comprehensive implementation plan.

## Phase 0: Orient

### 0a. Study specifications
Read `specs/cats-effect-zio-comparison.md` using parallel subagents.

### 0b. Study existing implementation
Use parallel subagents to analyze relevant source directories:
- `packages/web/app/` - Next.js routing structure
- `packages/web/components/` - Existing UI components (LessonCard, SideBySide, CodeBlock, Callout)
- `packages/web/content/` - MDX content structure, pairings.ts
- `packages/web/lib/` - Content loading and schemas
- `UX-DESIGN.md` - Design system and tokens

### 0c. Study the current plan
Read `IMPLEMENTATION_PLAN.md` if it exists.

## Phase 1: Expert-Level Research (CRITICAL - DO NOT SKIP)

### 1a. Study Cats Effect 3.x
- Read official docs: https://typelevel.org/cats-effect/docs/getting-started
- Clone: https://github.com/typelevel/cats-effect
- Analyze source: core IO, Resource, Fiber, IORuntime implementations
- Document: core concepts, patterns, terminology, idiomatic code

### 1b. Study ZIO 2.x
- Read official docs: https://zio.dev/overview/getting-started
- Clone: https://github.com/zio/zio
- Analyze source: core ZIO, ZManaged, Fiber, Runtime implementations
- Document: core concepts, patterns, terminology, idiomatic code

### 1c. Comparative Analysis
- Map: IO ↔ ZIO, Resource ↔ ZManaged, typeclasses ↔ environment
- Identify: semantic differences (errors, composition, mental model)
- Document: "gotchas" where libraries diverge significantly
- Create: concept mapping table

### 1d. Scastie/ScalaFiddle Research
- Research: Scastie embedding API (https://scastie.scala-lang.org)
- Test: iframe embedding, output handling, error states, mobile
- Research: ScalaFiddle as fallback (https://scalafiddle.io)
- Document: API requirements, parameters, fallback strategy

### 1e. Logo and Color Extraction
- Find: official Cats Effect logo (SVG), extract primary color
- Find: official ZIO logo (SVG), extract primary color
- Document: hex codes, SVG paths, usage guidelines

### 1f. Content Structure Planning
- Determine: optimal number of steps (not 12 - custom for Scala)
- Plan: step topics based on comparative analysis
- Decide: which concepts need stacked vs side-by-side presentation
- Create: outline for each step

## Phase 2: Gap Analysis

Compare specs against implementation:
- What exists from jj-git that we can reuse?
- What new components do we need?
- What infrastructure changes are required?

**CRITICAL**: Don't assume something isn't implemented. Search the codebase first.

## Phase 3: Generate Plan

Update `IMPLEMENTATION_PLAN.md` with:
- Research findings and concept mappings
- Tasks sorted by priority (P0 → P1 → P2)
- Clear descriptions with file locations
- Dependencies noted where relevant
- New tasks discovered during research

Capture the WHY, not just the WHAT.

## Guardrails

999. NEVER implement code in planning mode
1000. Use up to 10 parallel subagents for analysis
1001. Each task must be completable in ONE loop iteration
1002. EXPERT-LEVEL RESEARCH IS CRITICAL - clone repos, analyze source, don't just skim docs
1003. Self-discover new tasks as research reveals unknowns
1004. Use jj commands (jj commit) NOT git commands
