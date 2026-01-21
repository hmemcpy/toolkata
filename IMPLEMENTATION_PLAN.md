# Implementation Plan: toolkata

> **Status**: Greenfield (no code exists yet)
> **Validation**: `bun run typecheck`, `bun run lint`, `bun run build`, manual testing
> **Priority Legend**: P0 = Blocking, P1 = Core MVP, P2 = Polish/Enhancement
> **Last Updated**: 2026-01-22 (Validated - plan is accurate, ready for execution)

---

## Summary

Build toolkata from scratch as a Bun monorepo with two packages:
- `packages/web` - Next.js 16 frontend (deploys to Vercel)
- `packages/sandbox-api` - Effect-TS API for ephemeral Docker containers (self-hosted VPS)

Initial content: **jj ← git** comparison with 12 tutorial steps.

**Target Users**: Developers who know git and want to learn jj quickly without reading docs.

**Core Experience**: Side-by-side command comparisons + interactive sandboxed terminal for hands-on practice.

---

## Gap Analysis

| Area | Status | Notes |
|------|--------|-------|
| Monorepo setup | **Complete** | Root package.json, workspace config |
| Web frontend | **Partial** | Next.js 16 + React 19 basic app running |
| Sandbox API | **Partial** | Basic package structure, no Effect-TS yet |
| Design system | **Not started** | Design tokens specified in UX-DESIGN.md |
| Content infrastructure | **Not started** | MDX schema specified in PLAN.md |
| UI components | **Not started** | 12 components specified in UX-DESIGN.md |
| Pages | **Not started** | 4 page types specified |
| Progress tracking | **Not started** | localStorage schema specified |
| Interactive terminal | **Not started** | xterm.js integration planned |
| Tutorial content | **Not started** | 12 steps outlined in PLAN.md |
| Deployment | **Not started** | Vercel + VPS planned |

### Specifications Reviewed

| Document | Key Decisions |
|----------|---------------|
| `specs/toolkata.md` | User stories, acceptance criteria (FCP <1s, LCP <2s), security constraints, edge cases |
| `PLAN.md` | Monorepo structure, sandbox architecture, API design, Effect-TS patterns |
| `UX-DESIGN.md` | Design tokens, component specs, accessibility (AAA contrast), wireframes |
| `AGENTS.md` | Available skills, development guidelines, code style (Biome) |

---

## Tasks

### Phase 1: Project Setup [P0 - Blocking]

> **WHY**: Cannot proceed with any development without project structure. This is the foundation for all subsequent work.

- [x] **1.1** Initialize monorepo root with Bun workspaces
  - Create root `package.json` with `"workspaces": ["packages/*"]`
  - Add shared dev scripts: `dev`, `build`, `lint`, `typecheck`, `format`
  - Location: `/package.json`

- [x] **1.2** Create `packages/web` with Next.js 16 + React 19
  - `bun create next-app packages/web --typescript --tailwind --app`
  - Configure for App Router (no pages/ directory)
  - Remove default boilerplate content (globals.css, page.tsx content)
  - Location: `packages/web/`

- [x] **1.3** Create `packages/sandbox-api` with Effect-TS
  - Initialize with `bun init`
  - Add `effect@3` dependency
  - Create basic entry point `src/index.ts` with health check
  - Location: `packages/sandbox-api/`

- [x] **1.4** Configure shared TypeScript
  - Root `tsconfig.json` with strict settings:
    - `"strict": true`
    - `"exactOptionalPropertyTypes": true`
    - `"noUncheckedIndexedAccess": true`
    - `"noImplicitAny": true`
  - Extend in each package's tsconfig.json
  - Location: `/tsconfig.json`, `packages/*/tsconfig.json`

- [x] **1.5** Set up Biome for linting/formatting
  - Create `biome.json` at root
  - 2-space indent, no semicolons, double quotes
  - 100-char line width, trailing commas
  - `for...of` loops enforced, `forEach` banned
  - Optional chaining enforced
  - Location: `/biome.json`

- [x] **1.6** Configure Tailwind CSS 4 in packages/web
  - Use CSS-first configuration (Tailwind 4 style)
  - Prepare for design tokens integration
  - Location: `packages/web/tailwind.config.ts`, `packages/web/src/app/globals.css`

- [x] **1.7** Create comprehensive `.gitignore`
  - Node, Bun, Next.js, .env patterns
  - Build artifacts (`.next/`, `dist/`, `node_modules/`)
  - IDE files (`.idea/`, `.vscode/`)
  - Location: `/.gitignore`

---

### Phase 2: Design System & Layout [P0 - Blocking]

> **WHY**: All components depend on design tokens. Layout is required for every page. Must complete before building any UI.

- [x] **2.1** Create CSS custom properties in `packages/web/src/app/globals.css`
  - Colors (from UX-DESIGN.md):
    - `--color-bg: #0a0a0a`, `--color-surface: #141414`, `--color-border: #262626`
    - `--color-text: #fafafa`, `--color-text-muted: #a1a1a1`, `--color-text-dim: #525252`
    - `--color-accent: #22c55e` (green/jj), `--color-accent-alt: #f97316` (orange/git)
    - `--color-error: #ef4444`, `--color-warning: #eab308`
  - Typography: `--font-mono`, size scale (12px-32px)
  - Spacing: 8px base scale (4px through 64px)
  - Focus ring: `--focus-ring: 0 0 0 2px var(--color-accent)`
  - Transitions: `--transition-fast: 100ms ease`, `--transition-normal: 200ms ease`

- [x] **2.2** Configure JetBrains Mono font via next/font
  - Import from `next/font/google`
  - Apply to `<html>` element as primary font
  - Location: `packages/web/src/app/layout.tsx`

- [x] **2.3** Create root layout `packages/web/src/app/layout.tsx`
  - Dark theme (`bg-[var(--color-bg)]`)
  - Skip link for accessibility ("Skip to main content")
  - Meta viewport, lang="en"
  - Descriptive title template: `%s | toolkata`
  - Location: `packages/web/src/app/layout.tsx`

- [x] **2.4** Create Header component
  - Logo "toolkata_" (monospace, underscore as cursor effect)
  - Navigation: [GitHub] [?Help]
  - Mobile: hamburger menu (collapsible)
  - Keyboard accessible with proper focus management
  - Location: `packages/web/components/ui/Header.tsx`

- [x] **2.5** Create Footer component
  - "Progress stored locally · No account needed · Open source"
  - Minimal styling, `--color-text-muted`
  - Location: `packages/web/components/ui/Footer.tsx`

---

### Phase 3: Content Infrastructure [P0 - Blocking]

> **WHY**: Pages cannot render without MDX loading. Schema validation prevents runtime errors. Must be ready before any content pages.

- [x] **3.1** Define MDX frontmatter schema with Zod
  - Fields: `title` (string, required), `step` (number, required), `description` (string), `gitCommands` (string[]), `jjCommands` (string[])
  - Strict validation - fail fast on invalid content
  - Location: `packages/web/lib/content/schemas.ts`
  - Note: Using app/ directory structure (not src/)

- [ ] **3.2** Create tool pairing registry
  - `jj-git` as first (and only MVP) pairing
  - Interface: `{ slug, from: { name, description }, to: { name, description }, category, steps, status }`
  - Status: "published" | "coming_soon"
  - Location: `packages/web/src/content/pairings.ts`

- [ ] **3.3** Create ContentService with Effect-TS
  - `loadStep(toolPair, step)` → `Effect<StepContent, ContentError>`
  - `listSteps(toolPair)` → `Effect<StepMeta[], ContentError>`
  - Error types using `Data.TaggedClass`: `NotFound`, `ParseError`, `ValidationError`
  - Location: `packages/web/src/services/content.ts`

- [ ] **3.4** Configure MDX with gray-matter for Next.js
  - Install: `gray-matter`, `@next/mdx`, `@mdx-js/react`
  - Configure `next.config.ts` for MDX support
  - Set up MDX compilation pipeline
  - Location: `packages/web/next.config.ts`

- [ ] **3.5** Create MDX component mapping
  - Map `code` → CodeBlock, `pre` → CodeBlock
  - Map custom components: `SideBySide`, `Callout`, `Terminal`
  - Location: `packages/web/src/components/mdx/MDXComponents.tsx`

---

### Phase 4: UI Components [P1 - Core MVP]

> **WHY**: Pages are composed of these components. Build in dependency order (simple → complex).

- [ ] **4.1** Build CodeBlock component
  - Syntax highlighting with shiki (SSR-safe)
  - Copy button with clipboard API + success feedback (checkmark)
  - Language label in header bar
  - Line numbers optional via prop
  - Location: `packages/web/src/components/ui/CodeBlock.tsx`

- [ ] **4.2** Build SideBySide comparison component
  - Two-column layout (git left, jj right)
  - Subtle background tint: `rgba(f97316, 0.05)` for git, `rgba(22c55e, 0.05)` for jj
  - Mobile: stack vertically with ↓ arrow indicator between
  - Use proper `<table>` semantics for accessibility
  - Location: `packages/web/src/components/ui/SideBySide.tsx`

- [ ] **4.3** Build Callout component
  - Variants: TIP (green), WARNING (yellow), NOTE (gray)
  - Left border accent (3px), transparent background
  - `role="note"` for accessibility
  - Location: `packages/web/src/components/ui/Callout.tsx`

- [ ] **4.4** Build ProgressBar component
  - Visual progress indicator (filled blocks, green accent)
  - Shows "N/M" text alongside
  - `aria-valuenow`, `aria-valuemin`, `aria-valuemax` for accessibility
  - Location: `packages/web/src/components/ui/ProgressBar.tsx`

- [ ] **4.5** Build ComparisonCard component
  - For home page tool pairing grid
  - Shows: tool names ("jj ← git"), description, ProgressBar, step count
  - States: default, hover (border highlight), has-progress, coming-soon (muted)
  - Touch target >= 44px, keyboard accessible
  - Location: `packages/web/src/components/ui/ComparisonCard.tsx`

- [ ] **4.6** Build StepProgress header component
  - Shows: back link ("← Overview"), "Step N of M: Title", next link
  - Keyboard nav hints (← and → arrow keys)
  - Responsive: condense on mobile
  - Location: `packages/web/src/components/ui/StepProgress.tsx`

- [ ] **4.7** Build Navigation footer component
  - Previous/Next step buttons
  - "Mark Complete" button (primary action, green accent)
  - Touch targets >= 44px
  - Justify-between layout
  - Location: `packages/web/src/components/ui/Navigation.tsx`

- [ ] **4.8** Build StepList component
  - Checklist of all steps with completion state
  - Icons: ✓ checkmark (done), → arrow (current), ○ circle (pending)
  - Grouped by section (Fundamentals, Daily Workflow, Advanced)
  - Clickable rows navigate to step
  - Location: `packages/web/src/components/ui/StepList.tsx`

- [ ] **4.9** Build CommandSuggestions component
  - Show suggested commands from MDX frontmatter
  - Click/tap to insert into terminal (callback prop)
  - Styled as clickable code blocks with hover state
  - Location: `packages/web/src/components/ui/CommandSuggestions.tsx`

---

### Phase 5: Pages [P1 - Core MVP]

> **WHY**: These are the actual routes users visit. Requires components from Phase 4.

- [ ] **5.1** Create home page `packages/web/src/app/page.tsx`
  - Hero section: "Learn X if you already know Y"
  - Subtext: "Hands-on tutorials for developers switching tools. No fluff. Just the commands you need."
  - Comparison grid using ComparisonCard
  - Category groupings (Version Control, Package Management)
  - Responsive: 3 columns desktop, 2 tablet, 1 mobile

- [ ] **5.2** Create comparison overview page `packages/web/src/app/[toolPair]/page.tsx`
  - "Why jj?" introduction section (from index.mdx)
  - Key differences callout box
  - StepList with all 12 steps grouped by section
  - Progress summary sidebar (desktop) / section (mobile)
  - Link to cheat sheet
  - "Continue Step N →" button if has progress

- [ ] **5.3** Create cheat sheet page `packages/web/src/app/[toolPair]/cheatsheet/page.tsx`
  - Two-column command reference table (git → jj)
  - Sections: Basics, Commits, History, Branches, Remotes, Undo
  - Copy button per row
  - Print-friendly styling (@media print)
  - Print button in header

- [ ] **5.4** Create step page `packages/web/src/app/[toolPair]/[step]/page.tsx`
  - MDX content rendering with MDXComponents
  - StepProgress header
  - Navigation footer
  - Placeholder for terminal (Phase 8): "Interactive sandbox coming soon"
  - CommandSuggestions component (not functional until Phase 8)

- [ ] **5.5** Add generateStaticParams for static generation
  - Pre-render all known tool pairs and steps
  - Use `generateStaticParams` in dynamic route pages
  - Location: All `[toolPair]` and `[step]` pages

- [ ] **5.6** Add page metadata (SEO)
  - Dynamic title: "Step N: Title | jj ← git | toolkata"
  - Description from MDX frontmatter
  - OpenGraph meta tags for social sharing
  - Location: All page files via `generateMetadata`

---

### Phase 6: Progress Tracking [P1 - Core MVP]

> **WHY**: Core UX feature - users want to resume where they left off. Can run parallel to Phase 5.

- [ ] **6.1** Create ProgressStore with localStorage
  - Schema: `{ [toolPair]: { completedSteps: number[], currentStep: number, lastVisited: string } }`
  - Graceful degradation if localStorage unavailable (try/catch)
  - Version the schema for future migrations (`version: 1`)
  - Location: `packages/web/src/core/ProgressStore.ts`

- [ ] **6.2** Create useStepProgress hook
  - Methods: `markComplete(step)`, `resetProgress()`, `getProgress()`
  - Sync to localStorage on change
  - Return `isLoading` state while hydrating (avoid SSR mismatch)
  - Location: `packages/web/src/hooks/useStepProgress.ts`

- [ ] **6.3** Integrate progress into step pages
  - Auto-mark step complete when user clicks "Next" or "Mark Complete"
  - Show completion state in StepProgress header (✓ icon)
  - Visual indicator for current step

- [ ] **6.4** Add progress display to ComparisonCard
  - Show ProgressBar on home page cards
  - "Continue from Step N" button if progress exists
  - "Start Learning →" if no progress

- [ ] **6.5** Add "Continue where you left off" functionality
  - On overview page, highlight current step in StepList
  - "Continue Step N →" primary CTA if progress exists
  - Show completed/total count in header

---

### Phase 7: Sandbox API [P1 - Core MVP]

> **WHY**: Interactive terminal is a key differentiator. API must exist before frontend integration. Can develop in parallel with Phase 5-6.

- [ ] **7.1** Create sandbox-api entry point
  - HTTP server with Bun.serve or Hono
  - Health check endpoint: `GET /health` → `{ status: "ok", timestamp }`
  - CORS configuration for frontend origin (toolkata.dev, localhost:3000)
  - Location: `packages/sandbox-api/src/index.ts`

- [ ] **7.2** Create Docker base image
  - Base: `debian:bookworm-slim`
  - Install: git, curl, jj (from GitHub releases)
  - Non-root user "sandbox" with home directory
  - Pre-configure git/jj user settings (name: "Sandbox User", email: sandbox@toolkata.dev)
  - Working directory: `/home/sandbox/workspace`
  - Location: `packages/sandbox-api/docker/Dockerfile`

- [ ] **7.3** Create ContainerService with Effect-TS
  - `create(toolPair)` → `Effect<Container, ContainerError>`
  - `destroy(containerId)` → `Effect<void, ContainerError>`
  - Uses dockerode for Docker API
  - Security flags: `--network=none`, `--read-only`, `--cap-drop=ALL`, memory 128MB, CPU 0.5
  - Location: `packages/sandbox-api/src/services/container.ts`

- [ ] **7.4** Create SessionService
  - Session states: `IDLE` | `STARTING` | `RUNNING` | `DESTROYING`
  - Timeout tracking: 5 min idle, 30 min max lifetime
  - Maps session ID to container ID
  - Auto-destroy on timeout or disconnect
  - Location: `packages/sandbox-api/src/services/session.ts`

- [ ] **7.5** Create WebSocketService for terminal proxy
  - Bidirectional terminal I/O (stdin/stdout/stderr)
  - Handle resize events from client
  - Proxy container output to WebSocket
  - Handle connection cleanup on close
  - Location: `packages/sandbox-api/src/services/websocket.ts`

- [ ] **7.6** Create RateLimitService
  - Per-IP limits: 10 sessions/hour, 2 concurrent max
  - 60 commands/minute throttle (optional)
  - In-memory store (Map with IP keys)
  - Error type: `RateLimited` with retry-after info
  - Location: `packages/sandbox-api/src/services/rate-limit.ts`

- [ ] **7.7** Create REST routes
  - `POST /sessions` → Create session, return `{ sessionId, wsUrl }`
  - `GET /sessions/:id` → Session status `{ status, createdAt, expiresAt }`
  - `DELETE /sessions/:id` → Destroy session immediately
  - Location: `packages/sandbox-api/src/routes/sessions.ts`

- [ ] **7.8** Create WebSocket route
  - `WS /sessions/:id/ws` → Terminal bidirectional stream
  - Authenticate session ID before accepting connection
  - Forward I/O between client and container via dockerode attach
  - Location: `packages/sandbox-api/src/routes/sessions.ts`

- [ ] **7.9** Create server layer composition
  - Wire ContainerService, SessionService, RateLimitService, WebSocketService
  - Use Effect-TS Layer composition pattern
  - Location: `packages/sandbox-api/src/services/server-layer.ts`

---

### Phase 8: Interactive Terminal [P1 - Core MVP]

> **WHY**: This is the hands-on learning experience. Depends on Phase 7 (sandbox API).

- [ ] **8.1** Install xterm.js dependencies in packages/web
  - `@xterm/xterm`, `@xterm/addon-fit`, `@xterm/addon-web-links`
  - CSS import for xterm.js base styles
  - Location: `packages/web/package.json`

- [ ] **8.2** Create InteractiveTerminal component
  - xterm.js integration with React refs (useRef)
  - Theming to match design tokens (JetBrains Mono, dark background #0c0c0c)
  - Min height 200px, max height 400px
  - Status indicator in header (●/○ with color states)
  - Location: `packages/web/src/components/ui/InteractiveTerminal.tsx`

- [ ] **8.3** Create SandboxClient service
  - Effect-TS client for sandbox API
  - `createSession(toolPair)` → `Effect<Session, SandboxError>`
  - `destroySession(sessionId)` → `Effect<void, SandboxError>`
  - WebSocket connection management
  - Location: `packages/web/src/services/sandbox-client.ts`

- [ ] **8.4** Implement terminal states in InteractiveTerminal
  - IDLE: "Click to start sandbox" button
  - CONNECTING: Loading spinner, "Starting sandbox..."
  - CONNECTED: Active terminal with green status indicator
  - TIMEOUT_WARNING: Yellow indicator "Session expires in X:XX"
  - EXPIRED: "Session expired" + [Restart] button
  - ERROR: Error message + [Retry] [Use static mode] buttons

- [ ] **8.5** Wire CommandSuggestions to terminal
  - Click handler inserts command text into terminal
  - Auto-focus terminal after insertion
  - Update `CommandSuggestions` component from Phase 4.9

- [ ] **8.6** Add session timer display
  - Countdown showing remaining time (Session: 4:32 / 5:00)
  - Visual indicator when < 1 minute (yellow then red)
  - Reset timer on activity

- [ ] **8.7** Add reset button functionality
  - [Reset] button destroys current session and creates new one
  - Brief inline confirmation before reset
  - Reset workspace to initial state

- [ ] **8.8** Implement fallback static mode
  - When sandbox unavailable or rate-limited
  - Show static code blocks with copy buttons
  - Message: "Interactive sandbox unavailable. Copy commands to try locally."
  - Link to cheat sheet

- [ ] **8.9** Lazy load terminal component
  - Use `next/dynamic` with `ssr: false`
  - Only load when user scrolls to "Try It" section or clicks to start
  - Preconnect to sandbox API domain (`<link rel="preconnect">`)

---

### Phase 9: Tutorial Content (jj ← git) [P1 - Core MVP]

> **WHY**: Content is the product. Structure established in Phase 3. Can start once content infrastructure is ready.

- [ ] **9.1** Create content directory structure
  - `packages/web/src/content/comparisons/jj-git/`
  - Ensure directory exists before adding MDX files

- [ ] **9.2** Write landing page content `index.mdx`
  - Why jj? Key differences from git (5 bullet points from PLAN.md)
  - Target audience description
  - Prerequisites (git familiarity)
  - Estimated total time (~40 min)

- [ ] **9.3** Write cheat sheet `cheatsheet.mdx`
  - Complete command mapping table (from UX-DESIGN.md section 3.6)
  - Sections: Basics, Commits, History, Branches, Remotes, Undo
  - Include notes for commands with different semantics

- [ ] **9.4** Write Step 1: Installation & Setup `01-installation.mdx`
  - Installing jj on macOS (`brew install jj`), Linux, Windows
  - Colocated repo setup (`jj git init --colocate` in existing git repo)
  - Verify installation with `jj --version`

- [ ] **9.5** Write Step 2: Mental Model `02-mental-model.mdx`
  - Working copy IS a commit (the @ commit)
  - No staging area - all changes auto-tracked
  - SideBySide diagram: git (working copy → staging → commit) vs jj (working copy = commit)

- [ ] **9.6** Write Step 3: Creating Commits `03-creating-commits.mdx`
  - `jj describe -m "message"` vs `git commit -m "message"`
  - `jj new` to start next commit
  - Demo: create file, describe, new

- [ ] **9.7** Write Step 4: Viewing History `04-viewing-history.mdx`
  - `jj log` vs `git log`
  - Understanding the log output (@ marker, change IDs)
  - Revset basics: `@`, `@-`, `root()`

- [ ] **9.8** Write Step 5: Navigating Commits `05-navigating-commits.mdx`
  - `jj edit <commit>` vs `git checkout <commit>`
  - `jj new <parent>` to create commit at specific parent
  - Demo: edit old commit, make changes, auto-rebase descendants

- [ ] **9.9** Write Step 6: Amending & Squashing `06-amending-squashing.mdx`
  - `jj squash` - squash into parent
  - `jj split` - split a commit
  - No interactive rebase needed - just edit commits directly

- [ ] **9.10** Write Step 7: Bookmarks `07-bookmarks.mdx`
  - Bookmarks replace branches
  - No "current branch" concept
  - `jj bookmark create/delete/list`
  - Push requires bookmark: `jj git push -b <bookmark>`

- [ ] **9.11** Write Step 8: Handling Conflicts `08-conflicts.mdx`
  - Conflicts stored in commits (not blocking!)
  - Conflict markers in files
  - Resolution workflow with `jj resolve`

- [ ] **9.12** Write Step 9: Rebasing `09-rebasing.mdx`
  - Automatic descendant rebasing
  - `jj rebase -d <destination>`
  - No need for `--update-refs`
  - Demo: edit old commit, watch descendants rebase

- [ ] **9.13** Write Step 10: Undo & Recovery `10-undo-recovery.mdx`
  - `jj undo` - undo last operation
  - `jj op log` - see all operations
  - `jj op restore` - restore to any operation
  - Key insight: jj never loses data!

- [ ] **9.14** Write Step 11: Working with Remotes `11-remotes.mdx`
  - `jj git fetch` vs `git fetch`
  - `jj git push` vs `git push`
  - No `git pull` - fetch then rebase pattern

- [ ] **9.15** Write Step 12: Revsets `12-revsets.mdx`
  - Advanced commit selection expressions
  - Common patterns: `@`, `@-`, `main..@`, `ancestors(@)`
  - Revset algebra: `|`, `&`, `-`
  - Practical examples for daily use

---

### Phase 10: Deployment [P1 - Core MVP]

> **WHY**: Cannot launch without deployment infrastructure.

- [ ] **10.1** Configure Vercel deployment for packages/web
  - Set root directory to `packages/web`
  - Framework preset: Next.js
  - Environment variable: `NEXT_PUBLIC_SANDBOX_API_URL`

- [ ] **10.2** Create systemd service file for sandbox-api
  - Auto-restart on failure (Restart=on-failure)
  - Resource limits (MemoryMax, CPUQuota)
  - Environment file for secrets
  - Location: `packages/sandbox-api/deploy/sandbox-api.service`

- [ ] **10.3** Create Caddy reverse proxy config
  - HTTPS + WSS termination (automatic certs via Let's Encrypt)
  - CORS headers configuration
  - WebSocket upgrade handling
  - Location: `packages/sandbox-api/deploy/Caddyfile`

- [ ] **10.4** Document VPS setup with gVisor
  - Install Docker with gVisor runtime (`runsc`)
  - Configure runsc as default runtime for sandbox containers
  - Test isolation: container cannot access host
  - Location: `packages/sandbox-api/README.md`

- [ ] **10.5** Add health check endpoint improvements
  - `GET /health` returns: `{ status: "ok", containers: N, uptime: X }`
  - Can be used for uptime monitoring

- [ ] **10.6** Configure environment variables
  - Frontend: `NEXT_PUBLIC_SANDBOX_API_URL=https://sandbox.toolkata.dev`
  - Sandbox API: `DOCKER_HOST`, `PORT`, `FRONTEND_ORIGIN`
  - Document in `.env.example` files

---

### Phase 11: Polish & Accessibility [P2 - Enhancement]

> **WHY**: Required for WCAG 2.1 AA compliance and professional UX. After core functionality works.

- [ ] **11.1** Add keyboard navigation (arrow keys)
  - `←` for previous step, `→` for next step
  - `?` to show keyboard shortcuts modal
  - Implement with event listeners on step pages
  - `Esc` to close modals, exit terminal focus

- [ ] **11.2** Verify focus indicators
  - All interactive elements have visible focus ring
  - Focus ring uses `--focus-ring` token (2px green outline)
  - Test with Tab navigation through entire site

- [ ] **11.3** Implement skip link properly
  - "Skip to main content" link visible on focus
  - Targets `<main id="main">` element
  - Styled to appear on focus only (sr-only until focused)

- [ ] **11.4** Test keyboard-only navigation
  - Complete entire tutorial without mouse
  - Document any gaps in navigation
  - Fix any focus traps (especially in terminal)

- [ ] **11.5** Verify contrast ratios (AAA target)
  - All text >= 7:1 contrast (AAA)
  - UI components >= 3:1 contrast
  - Use Chrome DevTools contrast checker or axe

- [ ] **11.6** Add reduced motion support
  - `@media (prefers-reduced-motion: reduce)` disables animations
  - Terminal cursor blink respects this
  - Loading spinners become static indicators

- [ ] **11.7** Add ARIA labels
  - Terminal: `role="application"` with descriptive aria-label
  - Progress: `aria-live="polite"` for completion announcements
  - Steps: proper heading hierarchy (h1 → h2 → h3)
  - Tables: proper `scope` attributes on headers

- [ ] **11.8** Test at 320px width
  - No horizontal scroll
  - All content accessible
  - Touch targets >= 44px
  - Test on real mobile device if possible

- [ ] **11.9** Test at 200% zoom
  - Layout remains usable
  - Text doesn't overflow containers
  - All functionality accessible

---

### Phase 12: Verification [P2 - Enhancement]

> **WHY**: Confidence before launch. Catches integration issues. Final quality gate.

- [ ] **12.1** Run `bun run typecheck` - zero errors

- [ ] **12.2** Run `bun run lint` - zero errors

- [ ] **12.3** Run `bun run build` in packages/web - successful

- [ ] **12.4** Manual test all routes
  - Home page loads with cards
  - Overview page shows step list with groupings
  - Each step page renders MDX content
  - Cheat sheet displays command table
  - Progress persists across refreshes

- [ ] **12.5** Manual test sandbox connection
  - Container starts within 2s
  - Commands execute correctly (jj log, jj status, etc.)
  - Session times out after 5 min idle
  - Reset button works

- [ ] **12.6** Verify progress persistence
  - Complete steps, refresh page - progress preserved
  - Clear localStorage - progress resets
  - Progress survives browser restart

- [ ] **12.7** Verify fallback mode
  - Block sandbox API (disconnect network)
  - Static mode activates gracefully
  - Copy buttons work
  - No JavaScript errors in console

- [ ] **12.8** Performance validation
  - First Contentful Paint < 1s
  - Largest Contentful Paint < 2s
  - Time to Interactive < 3s
  - Lighthouse score >= 90 (Performance, Accessibility)

---

## Discoveries & Notes

### Key Architectural Decisions (from PLAN.md)

1. **Monorepo with Bun workspaces** - Not npm/yarn/pnpm. Use `bun` exclusively.
2. **Effect-TS 3** for all services - Tagged errors with `Data.TaggedClass`, service composition with Layers
3. **No staging area in jj** - This is a key teaching point; working copy IS a commit
4. **gVisor runtime** for container isolation - Security critical for untrusted input
5. **localStorage only** for progress - No accounts for MVP, no server-side storage
6. **Static generation** for content pages - Use `generateStaticParams` for performance

### Performance Requirements (from specs/toolkata.md)

- First Contentful Paint: < 1s
- Largest Contentful Paint: < 2s
- Time to Interactive: < 3s
- Sandbox ready: < 2s after click

### Security Constraints (from specs/toolkata.md)

- Containers: `--network=none`, `--read-only`, `--cap-drop=ALL`
- Memory: 128MB limit per container
- CPU: 0.5 limit per container
- Processes: 50 max per container
- File descriptors: 64 max per container
- Timeout: 5 min idle, 30 min max lifetime
- Rate limit: 10 sessions/hour, 2 concurrent max per IP

### Design Constraints (from UX-DESIGN.md)

- Background: `#0a0a0a` (near-black)
- Font: JetBrains Mono everywhere (monospace-first)
- Contrast: AAA target (7:1 minimum for text)
- Touch targets: >= 44px
- Mobile-first: 320px minimum width
- No animations except functional transitions

### Edge Cases to Handle (from specs/toolkata.md)

- Sandbox unavailable → Show static fallback with copy buttons
- Rate limited → Show countdown and static mode option
- Session expiry → Warning at 1 min, restart button after expiry
- Network disconnect → WebSocket reconnection attempt, then error state
- Invalid MDX content → Fail fast with validation errors in development
- localStorage unavailable → Graceful degradation, no progress tracking

### Implementation Discoveries

**TypeScript Project References Issue:**
- Root tsconfig originally had `composite: true` with project references
- Next.js uses `noEmit: true` which conflicts with `composite: true`
- Solution: Removed project references, use simple `extends` pattern
- Each package runs its own `tsc --noEmit` for type checking

**TypeScript JSX Setting:**
- Root tsconfig needs `"jsx": "preserve"` for React/Next.js packages
- Without it, `tsc --build` fails with "Cannot use JSX unless the '--jsx' flag is provided"
- Added to root tsconfig.json since all packages extend it

**Tailwind CSS 4 PostCSS:**
- Requires `@tailwindcss/postcss` plugin (not `tailwindcss` directly)
- CSS-first config with `@import "tailwindcss"` in globals.css

**Bun Workspace Warning:**
- Next.js warns about multiple lockfiles (package-lock.json from parent dir)
- Can be ignored or suppressed with turbopack.root config

### Out of Scope (MVP)

- User accounts / authentication
- Cross-device progress sync
- Dark/light theme toggle (dark only)
- Community-contributed comparisons
- Pre-warmed container pools
- Firecracker microVMs
- Multiple tool versions per comparison

---

## Execution Notes

- **Single task per iteration**: Each checkbox is designed to be completable in one focused session
- **Dependencies are ordered**: Phase numbers indicate dependency order (complete P0 before P1)
- **P0 before P1 before P2**: Complete blocking tasks first
- **Validate often**: Run `bun run typecheck` after every phase
- **Use Bun exclusively**: No npm, no yarn, no pnpm
- **Use available skills**: `/effect-ts` for services, `/frontend-design` for components, `/typescript` for type issues
- **Follow code style**: 2-space indent, no semicolons, double quotes, trailing commas (Biome)

## Recommended Execution Order

For efficient parallel development:

1. **Foundation (Sequential)**: Phase 1 must complete first - establishes project structure
2. **Design + Content (Parallel)**: Phase 2 (design system) and Phase 3 (content infrastructure) can run in parallel after Phase 1
3. **Components (Sequential)**: Phase 4 depends on Phase 2 design tokens
4. **Pages + Progress (Parallel)**: Phase 5 (pages) and Phase 6 (progress) can run in parallel after Phase 4
5. **Sandbox (Parallel to Pages)**: Phase 7 (sandbox API) can develop independently after Phase 1
6. **Terminal Integration**: Phase 8 requires both Phase 5 (pages) and Phase 7 (sandbox API)
7. **Content Writing**: Phase 9 can start once Phase 3 content infrastructure is ready
8. **Deployment**: Phase 10 can start once Phase 5 pages and Phase 7 API are working
9. **Polish**: Phase 11-12 are final refinements after all core functionality

### Critical Path

```
Phase 1 (Setup)
    ├── Phase 2 (Design) ──┬── Phase 4 (Components) ── Phase 5 (Pages) ──┐
    │                      │                                              │
    ├── Phase 3 (Content) ─┴── Phase 9 (Tutorial Content)                 ├── Phase 8 (Terminal) ── Phase 10 (Deploy)
    │                                                                     │
    └── Phase 7 (Sandbox API) ────────────────────────────────────────────┘

Phase 6 (Progress) runs parallel to Phase 5
Phase 11-12 (Polish) after Phase 10
```

---

## Appendix: Component Reference

| Component | Location | Dependencies |
|-----------|----------|--------------|
| Header | `components/ui/Header.tsx` | None |
| Footer | `components/ui/Footer.tsx` | None |
| CodeBlock | `components/ui/CodeBlock.tsx` | shiki (syntax) |
| SideBySide | `components/ui/SideBySide.tsx` | CodeBlock |
| Callout | `components/ui/Callout.tsx` | None |
| ProgressBar | `components/ui/ProgressBar.tsx` | None |
| ComparisonCard | `components/ui/ComparisonCard.tsx` | ProgressBar |
| StepProgress | `components/ui/StepProgress.tsx` | None |
| Navigation | `components/ui/Navigation.tsx` | None |
| StepList | `components/ui/StepList.tsx` | None |
| CommandSuggestions | `components/ui/CommandSuggestions.tsx` | CodeBlock |
| InteractiveTerminal | `components/ui/InteractiveTerminal.tsx` | xterm.js |

---

## Appendix: Service Reference

| Service | Location | Effect-TS Patterns |
|---------|----------|-------------------|
| ContentService | `web/services/content.ts` | `Context.Tag`, `Data.TaggedClass` errors |
| SandboxClient | `web/services/sandbox-client.ts` | `Context.Tag`, WebSocket handling |
| ContainerService | `sandbox-api/services/container.ts` | `Context.Tag`, dockerode integration |
| SessionService | `sandbox-api/services/session.ts` | State machine, timeout scheduling |
| WebSocketService | `sandbox-api/services/websocket.ts` | Bidirectional streams |
| RateLimitService | `sandbox-api/services/rate-limit.ts` | In-memory counters |
