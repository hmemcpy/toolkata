# Cats Effect ↔ ZIO Comparison Feature

> **Status**: Planning | **Scope**: Multiple related files | **Risk**: Aggressive | **Validation**: Existing test suite

## Overview

Add bidirectional comparison content for Scala functional programming libraries: Cats Effect and ZIO. This is a new content category for toolkata, expanding beyond version control tools into programming languages.

**Target audience**: Developers who already know one library and want to learn the other.

## Key Requirements

### Content Structure
- **Bidirectional**: Single "Cats Effect ↔ ZIO" comparison (not two separate courses)
- **Stacked layout**: Code examples stacked vertically (not side-by-side) due to complexity
- **Perspective headers**: "## Cats Effect Perspective" / "## ZIO Perspective"
- **Semantic differences**: Inline notes where concepts differ between libraries
- **Custom structure**: Not mirroring jj-git's 12-step format

### Technical Requirements
- **Terminal disabled**: `sandbox.enabled: false` in frontmatter (REPL support coming later)
- **Scastie embedding**: Interactive Scala REPL embedded in code blocks
- **Fallback**: ScalaFiddle if Scastie embedding doesn't work
- **Logos**: Embed official Cats Effect and ZIO logos with primary colors extracted
- **New category**: "Programming Languages" → "Scala"

### Design Decisions
- **Visual**: Bidirectional arrow (↔), no toggle
- **Component**: New `ScalaComparisonBlock` wrapping Scastie embeddings
- **Responsive**: 100% width mobile, 90% tablet, 80% desktop (max 800px)
- **Colors**: Extract from official logos (Cats Effect purple, ZIO blue)

## User Stories

- [ ] As a ZIO developer, I want to quickly find Cats Effect equivalents for common patterns
- [ ] As a Cats Effect developer, I want to understand ZIO's explicit error channel
- [ ] As a Scala developer, I want to run code examples directly in the browser via Scastie
- [ ] As a new visitor, I want to discover Scala library comparisons alongside version control tools

## Acceptance Criteria

### Home Page
- [ ] New "Programming Languages" category section with Scala logo
- [ ] Single "Cats Effect ↔ ZIO" card with bidirectional arrow
- [ ] Card shows estimated time and step count
- [ ] Card links to `/cats-effect-zio` overview page

### Overview Page
- [ ] Route: `/cats-effect-zio`
- [ ] Displays both library logos with descriptions
- [ ] Shows step list with custom sections (not 12 steps)
- [ ] Progress tracking works (localStorage)
- [ ] "Start Learning" button begins at step 1

### Step Pages
- [ ] Route: `/cats-effect-zio/step-1`, `/cats-effect-zio/step-2`, etc.
- [ ] Stacked layout with perspective headers
- [ ] Scastie embedded (or ScalaFiddle fallback)
- [ ] Terminal completely hidden (no `InteractiveTerminal`)
- [ ] Semantic differences highlighted in callouts
- [ ] Navigation between steps works

### Cheatsheet
- [ ] Route: `/cats-effect-zio/cheatsheet`
- [ ] Reference table showing key concepts side-by-side
- [ ] Copy buttons on code snippets
- [ ] Search/filter functionality

### Components
- [ ] `ScalaComparisonBlock` component created
- [ ] `ScastieEmbed` component (or `ScalaFiddleEmbed` fallback)
- [ ] Logo assets: `cats-effect.svg`, `zio.svg`
- [ ] Color tokens extracted and added to CSS

### Configuration
- [ ] `cats-effect-zio` added to `pairings.ts`
- [ ] New category type: "Programming Languages" with subcategory "Scala"
- [ ] Content files in `/packages/web/content/comparisons/cats-effect-zio/`

## Edge Cases & Error Handling

1. **Scastie embedding fails**
   - Fallback to ScalaFiddle
   - If both fail, show static code with copy button only

2. **Logo extraction fails**
   - Use fallback colors from official documentation
   - Cats Effect: purple (#bd93f9)
   - ZIO: blue (#0066ff)

3. **Content loading fails**
   - Show error state with link to GitHub for manual reading
   - Log error for debugging

4. **Progress tracking edge cases**
   - Handle step count changes gracefully
   - Support resetting progress

## Out of Scope

- REPL/sandbox integration (deferred to multi-docker feature)
- bidirectional toggle (using static bidirectional arrow instead)
- Video tutorials
- Community features (comments, discussions)
- Other Scala libraries (Fs2, http4s, etc.)
- Typelevel ecosystem beyond Cats Effect

## Technical Notes

### Version Control
- **Use jj commands** (not git) - working in jj workspace
- `jj commit` for all commits
- `jj git export` only when ready to push

### Validation Commands
```bash
# Type check
bun run typecheck

# Lint
bun run lint

# Build
bun run build

# Run tests
bun run test

# Automated route tests
./scripts/test-all.sh
```

### Research Tasks (Planning Phase)
1. Study Cats Effect 3.x documentation thoroughly
2. Study ZIO 2.x documentation thoroughly
3a. Study the Zionomicon book for the canonical pattners and references
   - '/Users/hmemcpy/Downloads/Zionomicon - 8.28.2025.ePub'
3. Clone and analyze source code from GitHub:
   - https://github.com/typelevel/cats-effect
   - https://github.com/zio/zio
4. Research Scastie embedding API
5. Research ScalaFiddle embedding API (fallback)
6. Extract colors from official SVG logos
7. Identify key concepts to compare (IO types, errors, concurrency, resources, etc.)

## Dependencies

- **External**: Scastie/ScalaFiddle embedding support
- **Internal**: Existing component infrastructure, routing system
- **Design**: UX-DESIGN.md tokens and patterns
