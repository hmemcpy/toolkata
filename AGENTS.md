# toolkata - AI Agents & Skills Guide

This document describes the AI agents and skills available for developing the toolkata developer tool comparison website.

## Core Principles

Before using any skill or writing code:

1. **Read `PLAN.md`** - Contains architecture decisions, project structure, and technical choices
2. **Read `UX-DESIGN.md`** - Contains design system, wireframes, and accessibility requirements
3. **Follow Effect-TS patterns** - All server-side code uses Effect-TS for composition and error handling
4. **Use Bun, NEVER npm or yarn** - This project uses Bun exclusively as its package manager and runtime. Do not use npm or yarn commands.

---

## Available Skills

### `/effect-ts`
**Purpose:** Comprehensive guide for Effect-TS, the functional TypeScript library used for all server-side services.

**Use for:**
- Building Effect applications and services
- Correct API usage patterns
- Common misconceptions and pitfalls
- Service composition with Layers
- Typed error handling

**toolkata Context:**
- **Frontend services** in `packages/web/src/services/` use Effect.ts
- **Sandbox API** in `packages/sandbox-api/src/services/` uses Effect.ts
- Service composition follows the pattern in `PLAN.md`
- Error types use `Data.TaggedClass` for pattern matching

**Key Services:**
```
packages/web/src/services/
├── content.ts          # MDX loading service
├── sandbox-client.ts   # Client for sandbox API
└── server-layer.ts     # Service composition

packages/sandbox-api/src/services/
├── container.ts        # Docker container management
├── session.ts          # Session lifecycle
├── websocket.ts        # Terminal WebSocket proxy
└── rate-limit.ts       # Rate limiting
```

**Examples:**
```
/effect-ts How do I properly compose the ContentService with error handling?
/effect-ts Review this sandbox session service for Effect anti-patterns
/effect-ts What's the pattern for WebSocket streams in Effect?
```

---

### `/typescript`
**Purpose:** TypeScript performance optimization, configuration, and type error resolution.

**Use for:**
- Optimizing TypeScript compilation speed
- Configuring tsconfig.json (strict mode)
- Fixing type errors (TS2322, TS2339, etc.)
- Improving async patterns
- Module organization
- Type-safe patterns

**Triggers:**
- Working with `.ts`, `.tsx`, `.d.ts` files
- Type definitions and module work
- tsc compilation issues
- "is not assignable to" errors

**toolkata Context:**
- **Strict mode** enabled with all strict checks
- `exactOptionalPropertyTypes: true`
- `noUncheckedIndexedAccess: true`
- 2-space indentation, 100 char line width (Biome)
- No semicolons (ASI)
- See `PLAN.md` for full TypeScript configuration

**Examples:**
```
/typescript Fix the type errors in the sandbox client
/typescript How should I type the MDX frontmatter schema?
/typescript Review async patterns in this WebSocket handler
```

---

### `/frontend-design`
**Purpose:** Create distinctive, production-grade frontend interfaces with high design quality.

**Use for:**
- Building web components and pages
- Creating UI with strong visual design
- Avoiding generic AI aesthetics
- Production-ready component implementation

**toolkata Context:**
- **Terminal aesthetic** - Surgical precision, zero noise
- **Monospace typography** - JetBrains Mono / Fira Code
- **Dark theme** - Near-black background (#0a0a0a)
- **Minimal color palette** - Green accent (#22c55e), Orange for git (#f97316)
- **No animations** except functional transitions
- See `UX-DESIGN.md` for full design system

**Examples:**
```
/frontend-design Build the InteractiveTerminal component with xterm.js
/frontend-design Create the SideBySide command comparison component
/frontend-design Implement the ComparisonCard with progress indicator
```

---

### `/ux-designer`
**Purpose:** User experience and interface design specialist.

**Use for:**
- UI/UX verification against design guidelines
- Ensuring terminal aesthetic adherence
- Accessibility reviews (WCAG 2.1 AA)
- User flow optimization
- Responsive design verification

**toolkata Context:**
- See `UX-DESIGN.md` for complete design specifications
- Design tokens defined in the design system section
- Target AAA contrast (7:1) for monospace readability
- Mobile-first responsive design
- Keyboard navigation required throughout

**Examples:**
```
/ux-designer Review this step page layout for consistency with terminal aesthetic
/ux-designer Check if the terminal component meets accessibility standards
/ux-designer Verify the mobile responsive behavior of the comparison cards
```

---

### `/vercel-react-best-practices`
**Purpose:** React and Next.js performance optimization guidelines from Vercel Engineering.

**Use for:**
- Writing or reviewing React/Next.js code
- Performance optimization
- Data fetching patterns
- Bundle optimization
- Component design patterns

**toolkata Context:**
- Next.js 16 with App Router
- React 19
- MDX for content
- Lazy-loaded terminal component
- Static generation for content pages

**Examples:**
```
/vercel-react-best-practices Optimize the step page data fetching
/vercel-react-best-practices Review the MDX rendering for performance
/vercel-react-best-practices Should the terminal component be lazy loaded?
```

---

### `/agent-browser`
**Purpose:** Automates browser interactions for web testing, form filling, screenshots, and data extraction.

**Use for:**
- End-to-end (E2E) testing with Playwright
- Testing the sandbox terminal interaction
- Taking screenshots for visual regression
- Testing user flows (lesson progression, sandbox usage)

**Examples:**
```
/agent-browser Test the complete lesson flow from home to step completion
/agent-browser Verify the sandbox terminal connects and accepts input
/agent-browser Take screenshots of all step pages at mobile breakpoint
```

---

### `/profile`
**Purpose:** Switch Claude profile between native and z.ai settings.

**Use for:**
- Changing Claude behavior/personality
- Switching between different AI configurations

---

## Agent Usage Guidelines

### When to Use Skills

1. **At task start** - If the task clearly matches a skill's purpose, invoke immediately
2. **After exploring** - Use skills to implement solutions after understanding the problem
3. **For reviews** - Use `/ux-designer` or `/vercel-react-best-practices` to review code

### How to Invoke

Skills can be invoked using the `/skill-name` syntax:

```
/skill-name [optional arguments]
```

### Multiple Skills in Parallel

If tasks are independent, you can run multiple agents in parallel by specifying them in a single message.

---

## Skill Combinations

### Common Patterns

**Building a new frontend component:**
1. Read `UX-DESIGN.md` for specifications
2. `/frontend-design` - Build the component
3. `/vercel-react-best-practices` - Optimize performance
4. `/ux-designer` - Verify accessibility
5. `/agent-browser` - Test the component

**Building a new Effect service:**
1. Read `PLAN.md` for architecture patterns
2. `/effect-ts` - Design and implement the service
3. `/typescript` - Ensure type safety

**Fixing type issues:**
1. `/typescript` - Diagnose and fix type errors
2. `/effect-ts` - Ensure Effect.ts patterns are correct

**Code review & refactoring:**
1. `/typescript` - Review type system patterns
2. `/effect-ts` - Review service patterns, error handling
3. Reference `PLAN.md` for project conventions

**Design verification:**
1. `/ux-designer` - Review against design system in `UX-DESIGN.md`
2. `/vercel-react-best-practices` - Check for performance issues

---

## Project Structure

### Monorepo Layout

```
toolkata/
├── packages/
│   ├── web/                    # Frontend (Vercel)
│   │   ├── app/                # Next.js App Router pages (not src/app/)
│   │   ├── components/         # React components
│   │   │   ├── ui/             # Reusable UI components
│   │   │   └── mdx/            # MDX component mapping
│   │   ├── content/            # MDX content files
│   │   ├── services/           # Effect-TS services
│   │   ├── lib/                # Utilities
│   │   ├── hooks/              # React hooks
│   │   ├── core/               # Client state (localStorage)
│   │   └── package.json
│   │
│   └── sandbox-api/            # Sandbox API (Self-hosted VPS)
│       ├── src/
│       │   ├── services/       # Effect-TS services
│       │   ├── lib/            # Docker utilities
│       │   └── routes/         # REST + WebSocket endpoints
│       ├── docker/             # Sandbox container image
│       └── package.json
│
├── PLAN.md                     # Architecture & implementation plan
├── UX-DESIGN.md                # Design system & wireframes
├── AGENTS.md                   # This file
├── biome.json                  # Linting & formatting
└── tsconfig.json               # TypeScript config
```

### Key Components (packages/web)

| Component | Purpose |
|-----------|---------|
| `InteractiveTerminal` | xterm.js-based sandbox terminal |
| `SideBySide` | Two-column command comparison (git vs jj) |
| `CodeBlock` | Syntax-highlighted code with copy button |
| `ComparisonCard` | Home page tool pairing selector |
| `StepProgress` | Step navigation header |
| `Callout` | Tips, warnings, notes |

### Key Services

| Service | Location | Purpose |
|---------|----------|---------|
| `ContentService` | web/services | MDX loading and parsing |
| `SandboxClient` | web/services | API client for sandbox |
| `ContainerService` | sandbox-api/services | Docker container lifecycle |
| `SessionService` | sandbox-api/services | Session management |
| `WebSocketService` | sandbox-api/services | Terminal I/O proxy |

---

## Development Guidelines

### Package Manager

**Always use `bun` instead of `npm` or `yarn`.** This project uses bun as its package manager and runtime.

```bash
# Install dependencies (from root)
bun install

# Run frontend dev server
bun run --cwd packages/web dev

# Run sandbox API dev server
bun run --cwd packages/sandbox-api dev

# Build frontend
bun run --cwd packages/web build

# Run tests
bun run test

# Lint and format
bun run lint
bun run format
```

### Code Style (Biome)

- 2-space indentation
- 100 character line width
- Double quotes for strings
- Trailing commas
- **No semicolons** (ASI)
- `for...of` loops, not `forEach`
- Optional chaining enforced (`?.`)

### TypeScript Strictness

```typescript
// Required patterns:
readonly items: readonly Item[]      // Immutable arrays
import type { SomeType } from "./x"  // Type-only imports
interface User { ... }               // Prefer interfaces over type aliases

// Forbidden:
any                                  // Use unknown instead
!                                    // No non-null assertions
```

### Effect-TS Patterns

```typescript
// Define errors with Data.TaggedClass
export class SessionError extends Data.TaggedClass("SessionError")<{
  readonly cause: "NotFound" | "Expired" | "RateLimited"
  readonly message: string
}> {}

// Define service interface
export interface SessionServiceShape {
  readonly create: (toolPair: string) => Effect.Effect<Session, SessionError>
  readonly destroy: (id: string) => Effect.Effect<void, SessionError>
}

// Create service tag
export class SessionService extends Context.Tag("SessionService")<
  SessionService,
  SessionServiceShape
>() {}

// Implement with Effect.gen
const make = Effect.gen(function* () {
  const config = yield* ServerConfig
  // ...implementation
  return { create, destroy }
})

// Export Live layer
export const SessionServiceLive = Layer.effect(SessionService, make)
```

---

## Content Guidelines

### Writing Style

When writing MDX content for lessons:
- **Direct and concise** - Developers want facts, not fluff
- **Show, don't tell** - Lead with code examples
- **Compare side-by-side** - Always show git equivalent
- **No celebration language** - No "Congratulations!", "Amazing!", emojis
- **Acknowledge difficulty** - "This is different from git" is fine

### MDX Frontmatter Schema

```yaml
---
title: "Your First Commits"
step: 3
description: "Learn the fundamental difference in how jj handles commits"
gitCommands: ["git add", "git commit"]
jjCommands: ["jj describe", "jj new"]
---
```

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| `PLAN.md` | **Architecture & implementation plan** - Tech stack, project structure, sandbox architecture |
| `UX-DESIGN.md` | **Design system & wireframes** - Components, tokens, accessibility, responsive behavior |
| `biome.json` | Linting and formatting rules |
| `tsconfig.json` | TypeScript configuration |

---

## Quick Reference

### Must-Read Before Coding

1. `PLAN.md` - Understand the architecture
2. `UX-DESIGN.md` - Understand the design system
3. This file - Understand available tools

### Skills for Common Tasks

| Task | Skills |
|------|--------|
| Build React component | `/frontend-design`, `/vercel-react-best-practices` |
| Build Effect service | `/effect-ts`, `/typescript` |
| Fix type errors | `/typescript`, `/effect-ts` |
| Review accessibility | `/ux-designer` |
| E2E testing | `/agent-browser` |
| Performance optimization | `/vercel-react-best-practices` |

### Commands

```bash
bun install          # Install deps
bun run dev          # Dev server (web)
bun run build        # Production build
bun run test         # Run tests
bun run lint         # Check lint
bun run format       # Format code
bun run typecheck    # Type check
./scripts/test-all.sh # Run automated test suite
```

### Testing

**Automated Testing:**
- `./scripts/test-all.sh` - Runs all route availability tests, HTML structure tests, and outputs manual testing checklist
- Tests all 16 routes: home, overview, 12 steps, cheat sheet
- Verifies accessibility elements (skip link, main landmark)
- Outputs comprehensive manual testing checklist for items requiring browser verification

**Manual Testing Checklist:**
Use browser DevTools to verify:
- Responsive design at 320px, 768px, 1024px+ breakpoints
- 200% zoom usability
- Touch targets >= 44px
- Focus indicators on all interactive elements
- Progress persistence (localStorage)
- Keyboard navigation (Tab, Arrow keys, Esc, ?)
- Terminal states (connecting, connected, error, timeout)
- Fallback mode when API unavailable
- Sandbox API integration (requires running sandbox-api)
