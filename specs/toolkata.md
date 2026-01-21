# toolkata - Requirements Specification

**Version:** 1.0
**Status:** Draft
**Last Updated:** 2026-01-22

---

## Overview

**toolkata** is a developer-focused website that teaches how to use tool X if you already know tool Y. The initial focus is **jj (Jujutsu) for Git users**.

### Core Value Proposition

- "Learn jj in 30 minutes if you already know git"
- Hands-on practice in sandboxed terminals
- No fluff, just command mappings and mental model shifts

---

## User Stories

### Home Page

- [ ] As a developer, I can see all available tool comparisons so I know what's offered
- [ ] As a returning user, I can see my progress on each comparison so I can continue where I left off
- [ ] As a developer, I can quickly identify which comparisons are published vs coming soon

### Comparison Overview Page

- [ ] As a developer, I can read a summary of why I might want to learn the new tool
- [ ] As a developer, I can see all steps in the tutorial with my completion status
- [ ] As a developer, I can navigate directly to any step I want to learn or review
- [ ] As a developer, I can access the cheat sheet for quick reference
- [ ] As a returning user, I can continue from where I left off with one click

### Step Page (Lesson)

- [ ] As a developer, I can read the content explaining the concept
- [ ] As a developer, I can see side-by-side command comparisons (git vs jj)
- [ ] As a developer, I can try commands in an interactive sandbox terminal
- [ ] As a developer, I can see suggested commands to try
- [ ] As a developer, I can click on suggested commands to insert them into the terminal
- [ ] As a developer, I can reset the sandbox to start fresh
- [ ] As a developer, I can mark a step as complete to track my progress
- [ ] As a developer, I can navigate to previous/next steps easily
- [ ] As a developer, I can use keyboard shortcuts to navigate (← →)

### Cheat Sheet Page

- [ ] As a developer, I can see a complete command mapping table (git → jj)
- [ ] As a developer, I can print the cheat sheet for offline reference
- [ ] As a developer, I can copy commands from the cheat sheet

### Interactive Sandbox

- [ ] As a developer, I can start a sandbox with one click
- [ ] As a developer, I can execute real commands (git, jj) in the sandbox
- [ ] As a developer, I can see the session time remaining
- [ ] As a developer, I am warned before my session expires
- [ ] As a developer, I can restart an expired session easily
- [ ] As a developer, I see a fallback static mode if the sandbox is unavailable

### Progress Tracking

- [ ] As a developer, my progress is saved automatically to localStorage
- [ ] As a developer, I can see my overall progress on each comparison
- [ ] As a developer, I can reset my progress if I want to start over

---

## Acceptance Criteria

### Performance

- [ ] First Contentful Paint < 1s
- [ ] Largest Contentful Paint < 2s
- [ ] Time to Interactive < 3s
- [ ] Sandbox container ready < 2s after click

### Accessibility (WCAG 2.1 AA)

- [ ] All text has contrast ratio ≥ 7:1 (targeting AAA)
- [ ] All interactive elements are keyboard accessible
- [ ] Skip link to main content exists
- [ ] Focus indicators visible on all focusable elements
- [ ] Touch targets ≥ 44px
- [ ] Reduced motion respected
- [ ] Screen reader compatible (ARIA labels, semantic HTML)

### Security (Sandbox)

- [ ] Containers have no network access
- [ ] Containers have read-only root filesystem
- [ ] Containers have memory limit (128MB)
- [ ] Containers have CPU limit (0.5)
- [ ] Containers auto-destroy after timeout (5 min idle, 30 min max)
- [ ] Rate limiting per IP (10 sessions/hour, 2 concurrent max)
- [ ] gVisor runtime for kernel isolation

### Responsive Design

- [ ] Mobile-first design (320px minimum)
- [ ] Works on tablet (768px)
- [ ] Full layout on desktop (1024px+)
- [ ] No horizontal scrolling at any breakpoint

---

## Edge Cases

### Sandbox

1. **Sandbox unavailable**: Show static fallback with copy-able commands
2. **Rate limited**: Show wait time and alternative actions
3. **Session expires**: Clear indication with restart option
4. **Network disconnect**: Terminal reconnects automatically or shows error
5. **Command hangs**: Timeout after reasonable period, allow cancel

### Content

1. **Invalid step number**: Redirect to overview page
2. **Invalid tool pair**: 404 page
3. **MDX parsing error**: Graceful error boundary with message

### Progress

1. **localStorage unavailable**: Graceful degradation, no progress tracking
2. **Corrupted progress data**: Reset to clean state
3. **Browser private mode**: Works without persistence warning

---

## Out of Scope (MVP)

- User accounts / authentication
- Cross-device progress sync
- Dark/light theme toggle
- Community-contributed comparisons
- Collaborative/shared terminal sessions
- Multiple tool versions per comparison
- Pre-warmed container pool
- Firecracker microVMs

---

## Technical Constraints

- **Frontend**: Next.js 16, React 19, TypeScript 5 (strict), Effect-TS 3
- **Styling**: Tailwind CSS 4
- **Content**: MDX with gray-matter
- **Linting**: Biome (no semicolons, 2-space indent)
- **Runtime**: Bun
- **Sandbox**: Docker + gVisor, dockerode, WebSocket

---

## Dependencies

### External Services

- **Vercel**: Frontend hosting
- **Hetzner/OVH/Oracle VPS**: Sandbox API hosting

### Key Libraries

- `@xterm/xterm`: Terminal emulator
- `dockerode`: Docker API client
- `ws`: WebSocket server
- `gray-matter`: MDX frontmatter parsing
- `effect`: Effect-TS for services

---

## Glossary

- **toolkata**: The project name (tool + kata = tool practice)
- **Tool Pair**: A comparison like "jj ← git"
- **Step**: Individual lesson in a tutorial
- **Sandbox**: Ephemeral Docker container for interactive practice
- **Cheat Sheet**: Quick reference command mapping table
