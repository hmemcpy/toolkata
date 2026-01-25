# Cats Effect ↔ ZIO Tutorial Improvements

> **Status**: Planning | **Scope**: Multiple related files | **Risk**: Aggressive | **Validation**: Existing test suite

## Overview

Improve the cats-zio tutorial with bidirectional support, proper syntax highlighting, fix terminal connection errors, and ensure ZIO examples follow Zionomicon best practices.

## Requirements

### R1: Disable Terminal for Cats-ZIO Pairing
- Create `config.yml` for cats-zio pairing with `sandbox.enabled: false`
- Terminal sidebar should not render for cats-zio pages
- No ERR_CONNECTION_REFUSED errors on port 3001
- Scastie embeds should work without sandbox

### R2: Syntax Highlighting with Shiki
- Configure Shiki for MDX code blocks via rehype plugin
- Update CodeBlock component to use Shiki output (not hardcoded green)
- Update ScalaComparisonBlock to syntax-highlight Scala code
- Dark theme matching terminal aesthetic (#0a0a0a background)
- Support languages: scala, typescript, bash, json, yaml

### R3: Bidirectional Tutorial UX Prototype
- Create `/scala-effects-demo` page demonstrating 4 UX options:
  1. Single page with column swap toggle (reuse DirectionToggle)
  2. Separate routes (/zio-cats and /cats-zio)
  3. Landing page chooser ("I know ZIO" / "I know Cats Effect")
  4. Smart home page cards (two cards, same content, direction preset)
- Allow user to evaluate and choose preferred approach

### R4: Fix Scastie Embeds
- Update ScastieEmbed component to use script tag method
- Support both saved snippets (UUID) and inline code
- Add loading states and error handling
- Dark theme support via `?theme=dark` query param

### R5: Zionomicon Reference Integration
- Review all cats-zio step content against Zionomicon patterns
- Update any outdated ZIO syntax or deprecated APIs
- Ensure examples use current ZIO 2.x best practices
- Reference: `/Users/hmemcpy/Downloads/Zionomicon - 8.28.2025.ePub`

## Constraints

- Use Bun exclusively (never npm or yarn)
- Follow Effect-TS patterns for any service code
- Maintain terminal aesthetic (dark theme, monospace, minimal)
- No semicolons (ASI), 2-space indentation, double quotes
- Shiki already installed as dependency (version ^3.6.0)

## Edge Cases

### Terminal Connection
- If sandbox API is running, cats-zio should still not connect
- Config.yml takes precedence over defaults

### Syntax Highlighting
- Language detection should fall back gracefully for unknown languages
- Inline code (`backticks`) should remain green accent color
- Only fenced code blocks get full syntax highlighting

### Scastie
- If Scastie is unavailable, show static code with copy button
- Handle slow loading gracefully (loading spinner)
- Respect user's system preference for reduced motion

## Out of Scope

- Self-hosting Scastie (use public instance)
- Scala REPL integration with sandbox
- Video tutorials or animations
- Other Scala libraries (fs2, http4s, doobie)
- Mobile-specific Scastie optimizations
