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
/frontend-design Implement the LessonCard with progress indicator
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
**Purpose:** Complete browser automation with Playwright for web testing, form filling, screenshots, and data extraction.

**Use for:**
- End-to-end (E2E) testing with Playwright
- Testing pages and user flows
- Responsive design verification (multiple viewports)
- Screenshot capture for visual regression
- Testing the sandbox terminal interaction
- Form filling and submission testing
- Checking for broken links

**toolkata Context:**
- Use to verify responsive design at 320px, 768px, 1024px+
- Test keyboard navigation (Tab, arrows, Esc)
- Verify progress persistence in localStorage
- Test fallback mode when sandbox unavailable
- Verify all 16 routes load correctly

**Examples:**
```
/agent-browser Test the complete lesson flow from home to step completion
/agent-browser Verify the sandbox terminal connects and accepts input
/agent-browser Take screenshots of all step pages at mobile breakpoint
/agent-browser Test the home page at mobile and desktop viewports
/agent-browser Verify keyboard navigation works on step pages
/agent-browser Test that progress persists after page refresh
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
| `LessonCard` | Home page tool pairing selector |
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

### Import Paths

**ALWAYS use `@/` path aliases instead of relative paths.**

```typescript
// ✅ Correct - use path aliases
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { getSandboxHttpUrl } from "@/lib/sandbox-url"
import { auth } from "@/lib/auth"

// ❌ Wrong - never use relative paths for imports
import { AdminSidebar } from "../../../components/admin/AdminSidebar"
import { getSandboxHttpUrl } from "../../lib/sandbox-url"
```

Path aliases are configured in `tsconfig.json` as `@/*` pointing to the web package root. This makes imports:
- **More readable** - clear what's being imported
- **More maintainable** - no broken imports when moving files
- **More consistent** - same pattern regardless of file location

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

### Overview Page Updates (REQUIRED)

**When adding a new tool pairing, you MUST update `app/[toolPair]/page.tsx`:**

1. **"Why {tool}?" section** — Add a conditional branch for your tool pair with:
   - Paragraph describing the tool's value proposition
   - 5 bullet points highlighting key features

   ```tsx
   {toolPair === "your-tool" ? (
     <>
       <p className="text-base text-[#d1d5dc] leading-relaxed mb-4">
         Your tool description...
       </p>
       <ul className="space-y-2 text-sm text-[#d1d5dc]">
         <li className="flex items-start gap-2">
           <span className="text-[var(--color-accent)] mt-0.5">•</span>
           <span>Feature 1</span>
         </li>
         {/* ... 4 more features */}
       </ul>
     </>
   ) : existingCondition ? (
     // existing zio-cats content
   ) : (
     // jj-git default content
   )}
   ```

2. **Step metadata array** — Add steps array with title/description for each step
3. **Estimated times Map** — Add time estimates for each step

**Common Pitfall:** If you copy content from another pairing, remember to update ALL hardcoded text. The overview page has per-tool-pairing content that must be customized.

### ScalaComparisonBlock Code Format (stripMargin)

Code blocks in `ScalaComparisonBlock` must use the `|` (pipe) prefix format to preserve indentation. This is required because MDX/JSX template literals strip leading whitespace from lines before the component receives them.

**How it works:**
- Each line of code starts with `|` as a margin marker
- The `normalizeCode` function strips everything up to and including `|` on each line
- Content after `|` is preserved exactly, including intentional indentation

**Example:**
```jsx
<ScalaComparisonBlock
  zioCode={`
    |import zio._
    |
    |val program =
    |  for {
    |    _ <- Console.printLine("Hello")
    |    _ <- Console.printLine("World")
    |  } yield ()
  `}
  catsEffectCode={`
    |import cats.effect._
    |
    |val program: IO[Unit] =
    |  for {
    |    _ <- IO.println("Hello")
    |    _ <- IO.println("World")
    |  } yield ()
  `}
  zioComment="ZIO comment here"
  catsEffectComment="Cats Effect comment here"
/>
```

**Why this is needed:**
Without `|` prefixes, lines like `  for {` would render as `for {` (losing the 2-space indent) because JSX normalizes whitespace in template literal attributes.

**Important:**
- Every line of code must start with `|`
- Empty lines should just be `|` alone
- The pipe goes at the true left margin (column 0 of intended content)
- Indentation before `|` is for MDX readability only and is discarded

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
| Browser automation | `/agent-browser` |
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

**Playwright Browser Tests:**
```bash
cd packages/web
bun run test           # Run all Playwright tests headless
bun run test:ui        # Open Playwright UI for interactive testing
bun run test:headed    # Run with visible browser window
```

Tests cover (see `packages/web/tests/browser.spec.ts`):
- Progress persistence (localStorage refresh, reset)
- Fallback mode when sandbox unavailable
- Responsive design at 320px width
- Layout at 200% zoom
- Keyboard navigation (Tab, arrows, ?, Esc, skip link)
- All 16 routes load successfully

**Using `/agent-browser` for Ad-hoc Testing:**
```bash
# Use the skill for quick browser automation
/agent-browser Test responsive design at mobile viewport
/agent-browser Take screenshot of the cheatsheet page
/agent-browser Verify all navigation links work
```

**Manual Testing Checklist:**
Use browser DevTools or `/agent-browser` to verify:
- Touch targets >= 44px
- Terminal states (connecting, connected, error, timeout)
- Sandbox API integration (requires running sandbox-api)

---

## Snippet Validation

Build-time validation system that executes code snippets from MDX content against sandbox Docker containers to ensure all tutorial examples compile and run correctly.

### Running Validation

```bash
cd packages/web

# Validate all snippets (runs automatically before build)
bun run validate:snippets

# Validate with strict mode (fails on errors, used in CI)
bun run validate:snippets --strict

# Validate specific tool pairing
bun run validate:snippets --tool-pair jj-git
bun run validate:snippets --tool-pair zio-cats
bun run validate:snippets --tool-pair effect-zio

# Validate specific step
bun run validate:snippets --tool-pair jj-git --step 3

# Show verbose output
bun run validate:snippets --verbose

# Skip cache (force re-validation)
bun run validate:snippets --no-cache

# Clear all cached results
bun run validate:snippets --clear-cache
```

### How It Works

1. **Extraction** — Parses MDX files and extracts code from `TryIt`, `SideBySide`, `ScalaComparisonBlock`, and `CrossLanguageBlock` components
2. **Config Resolution** — Merges validation config from three levels: pairing `config.yml` → step frontmatter → component props
3. **Execution** — Runs snippets in isolated Docker containers (bash for jj-git, scala for zio-cats, typescript for effect-zio)
4. **Error Detection** — Checks for tool-specific error patterns (shell errors, compilation failures)
5. **Caching** — Caches results at step level (SHA256 hash of config + MDX content)

### Skipping Validation

Add `validate={false}` prop to skip validation for specific snippets:

```jsx
{/* Pseudo-code or external dependencies */}
<ScalaComparisonBlock
  validate={false}
  zioCode={`val x = ???  // placeholder`}
  ...
/>

{/* Commands with sandbox limitations */}
<TryIt
  validate={false}
  command="jj op undo"
/>
```

**When to use `validate={false}`:**
- Pseudo-code with `???` or `...` placeholders
- Code using external libraries not in the sandbox (ciris, doobie, zio-schema)
- Commands that don't work in the restricted sandbox environment
- Teaching examples that show concepts but aren't meant to run

### Adding New Tool Pairings

1. Create `content/comparisons/{pairing}/config.yml` with validation config:

```yaml
validation:
  environment: bash  # or scala, typescript
  prelude:
    setup:
      - "init command 1"
      - "init command 2"
    imports:  # for scala/typescript
      - "import foo._"
```

2. Build the appropriate Docker environment image (if new environment type)
3. Run `bun run validate:snippets --tool-pair {pairing}` to validate

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "not a git repository" | Missing init setup | Add `jj git init .` to config.yml prelude |
| "value X is not a member" | Missing import | Add import to config.yml prelude or use `extraImports` prop |
| Compilation timeout | Bloop server issues | Scala uses `--server=false --jvm system` flags |
| "command not found" | Missing tool in sandbox | Check Docker image has required tools |
| Context error (expected) | Snippet needs prior state | Add `validate={false}` — these are teaching examples |

### Troubleshooting Guide

#### Shell/Bash Snippets (jj-git)

**Problem: "error: not a git repository"**
```
Solution: The config.yml prelude needs to initialize the repository before commands run.
Check content/comparisons/jj-git/config.yml has:

validation:
  environment: bash
  prelude:
    setup:
      - "jj git init --colocate ."
      - "git config user.email 'test@test.com'"
      - "git config user.name 'Test User'"
```

**Problem: Command with quotes truncated (e.g., `jj describe -m` without the message)**
```
Cause: The TryIt regex extractor had a bug where quotes inside commands were not handled.
Fixed in snippet-extractor.ts — ensure you're using the latest version.
```

**Problem: SideBySide commands failing**
```
Expected behavior: SideBySide snippets are teaching examples showing git/jj equivalence.
They're automatically skipped because each runs in isolation with no shared state.
If you need to validate specific commands, use TryIt instead.
```

**Problem: Permission denied on config.toml**
```
Cause: Some jj operations (like `jj op undo`) try to modify config.toml which is read-only.
Solution: Add `validate={false}` to these commands — they demonstrate concepts but can't
run in the restricted sandbox environment.
```

#### Scala Snippets (zio-cats)

**Problem: "value X is not a member of object ZIO"**
```
Cause: Missing import. Scala validation requires all imports to be present.
Solutions:
1. Add import to config.yml prelude (affects all steps)
2. Add import to step frontmatter (affects one step)
3. Use extraImports prop on the component (affects one snippet)

Example:
<ScalaComparisonBlock
  extraImports={["import zio.stream._"]}
  zioCode={`ZStream.fromIterable(...)`}
/>
```

**Problem: "ambiguous reference to overloaded definition"**
```
Cause: Both ZIO and Cats Effect define similar types (e.g., Fiber).
Solution: Add `validate={false}` to snippets that intentionally show both libraries
together, or use fully qualified names.
```

**Problem: External library not found (ciris, doobie, zio-schema)**
```
Cause: The sandbox only includes ZIO and Cats Effect core libraries.
Solution: Add `validate={false}` to snippets using external libraries.

Libraries NOT in sandbox: ciris, doobie, zio-interop-cats, zio.config.magnolia,
zio-schema, http4s, fs2-kafka, tapir
```

**Problem: Compilation timeout**
```
Cause: Bloop build server issues in Docker container.
Solution: The validation system uses `--server=false --jvm system` flags.
If still timing out:
1. Rebuild the Scala Docker image: bun run docker:build:all
2. Verify posix-libc-utils is installed (needed for JVM detection)
3. Check JAVA_HOME is passed to docker exec
```

**Problem: "type mismatch" errors in pseudo-code**
```
Cause: Teaching examples often use placeholder types like `???` or type annotations
that simplify the concept but don't compile.
Solution: Add `validate={false}` — these are intentionally simplified for teaching.
```

#### TypeScript Snippets (effect-zio)

**Problem: "Cannot find module 'effect'"**
```
Cause: The TypeScript sandbox needs the effect package pre-installed.
Solution: Rebuild TypeScript Docker image: bun run docker:build:all
The Dockerfile should have: npm install effect typescript tsx
```

**Problem: Missing java.io.IOException or other Java types**
```
Cause: ZIO code in CrossLanguageBlock uses Java exceptions that aren't imported.
Solution: Add `validate={false}` to these snippets, or add the import to config.yml.

Note: Some ZIO 2.x APIs have changed (foreachParN, race signature changes).
Add `validate={false}` to snippets showing deprecated patterns.
```

#### General Troubleshooting

**Problem: Validation passes locally but fails in CI**
```
1. Verify Docker images are built in CI workflow
2. Check .validation-cache/ is not committed (should be in .gitignore)
3. Ensure sandbox-api can start (check ports, Docker daemon)
```

**Problem: Cache not working (always re-validating)**
```
1. Check .validation-cache/ directory exists
2. Verify SHA256 hash matches (hash includes config.yml + MDX content)
3. Use --verbose flag to see cache hit/miss
4. Use --clear-cache to reset if cache is corrupted
```

**Problem: Validation hangs**
```
1. Script has 5-minute timeout with cleanup handlers
2. Check if sandbox-api is responding (curl http://localhost:3001/health)
3. Check Docker container is running and responsive
4. Individual command timeout is 30s — if hanging, the prompt detection may be failing
```

**Problem: "Cannot assign to read-only property" TypeScript errors**
```
Cause: This project uses exactOptionalPropertyTypes: true
Solution: Don't assign undefined to optional properties. Use conditional object building:

// Wrong
const obj = { a: 1, b: undefined }

// Right
const obj = condition ? { a: 1, b: value } : { a: 1 }
```

### Files

| File | Purpose |
|------|---------|
| `scripts/validate-snippets.ts` | CLI entry point |
| `scripts/snippet-extractor.ts` | MDX parsing and snippet extraction |
| `scripts/docker-validator.ts` | Docker-based validation execution |
| `scripts/config-resolver.ts` | 3-level config merging |
| `scripts/validation-cache.ts` | Step-level caching |
| `.validation-cache/` | Cached validation results (gitignored) |

---

## Sandbox Docker Image

The sandbox API runs user commands in isolated Docker containers. The image is built from `packages/sandbox-api/docker/`.

### Building the Image

```bash
cd packages/sandbox-api

# Build and run all tests (recommended)
bun run docker:build

# Build without tests (faster, for development)
bun run docker:build:no-test

# Custom image tag
IMAGE_TAG=v1.0.0 bun run docker:build
```

### Automated Tests

The build script (`scripts/docker-build.sh`) runs 5 tests on every build:

| Test | Description |
|------|-------------|
| Test 1 | Verify git and jj are installed and working |
| Test 2 | Test jj git workflow (init, commit, log) |
| Test 3 | UTF-8 support (Russian, Hebrew, Chinese characters) |
| Test 4 | Security hardening (no curl, wget, sudo, su, apt, dpkg) |
| Test 5 | Running as non-root user (sandbox) |

### Image Characteristics

- **Base**: Chainguard wolfi-base (minimal, security-focused)
- **Size**: ~197MB (70% smaller than Debian-based alternative)
- **Tools installed**: bash, git, jj (Jujutsu VCS)
- **Tools removed**: curl, wget, sudo, su, apt, dpkg, text editors
- **User**: Non-root `sandbox` user
- **Locale**: UTF-8 (en_US.UTF-8)
- **No text editors**: Users must use `-m` flag for commit messages

### Security Hardening

The image is hardened for sandboxed execution:
- No package managers (apt, dpkg removed)
- No network tools (curl, wget removed)
- No privilege escalation (sudo, su removed)
- Non-root user by default
- Minimal attack surface (Chainguard base)

### Key Files

```
packages/sandbox-api/
├── docker/
│   ├── Dockerfile        # Multi-stage build definition
│   └── entrypoint.sh     # Container startup script
├── scripts/
│   └── docker-build.sh   # Build script with automated tests
└── src/services/
    └── websocket.ts      # PTY terminal proxy (spawns docker exec)
```

### Modifying the Image

When changing the Dockerfile:
1. Always run `bun run docker:build` to verify tests pass
2. If adding tools, update Test 4 in `docker-build.sh` if needed
3. Ensure UTF-8 locale is preserved (Test 3)
4. Keep the non-root user requirement (Test 5)
