# Sandbox Integration Specification

## Overview

Complete the sandbox integration by: (1) wiring terminal state callbacks, (2) implementing shrinking layout for the terminal sidebar, (3) enhancing the TryIt component with expected output and editable commands, (4) reorganizing Docker images per tool-pair, and (5) adding gVisor runtime integration for defense-in-depth security.

## Requirements

### R1: Terminal State Synchronization

Connect `InteractiveTerminal` state changes to `TerminalContext` so the sidebar displays accurate connection status and session timer.

**Acceptance Criteria:**
- `TerminalContext.state` reflects actual terminal state (IDLE, CONNECTING, CONNECTED, etc.)
- `TerminalContext.sessionTimeRemaining` updates every second when session is active
- Sidebar header shows correct status indicator color and text
- Sidebar footer shows accurate session timer countdown

**Technical Notes:**
- `TerminalContext.tsx:166` has `_setState` that's never called
- `TerminalContext.tsx:170` has `_setSessionTimeRemaining` that's never called
- `TerminalSidebar.tsx:242` renders `InteractiveTerminal` without `onStateChange`/`onSessionTimeChange` props
- `InteractiveTerminal` already has the callback props defined (lines 103, 113) but needs `useEffect` to invoke them

### R2: Shrinking Layout

Replace the blocking overlay with a shrinking layout where main content remains fully interactive when sidebar is open.

**Acceptance Criteria:**
- No backdrop overlay when sidebar is open
- Main content area shrinks to make room for sidebar (not overlapped)
- Main content remains fully interactive (no `inert` attribute)
- TryIt buttons work while sidebar is open
- Sidebar width: 400px (desktop lg+)
- Smooth transition when opening/closing sidebar
- Works with `prefers-reduced-motion`

**Technical Notes:**
- Remove backdrop div from `TerminalSidebar.tsx:188-199`
- Remove `inert` attribute logic from `TerminalSidebar.tsx:149-164`
- Add CSS class to main content wrapper that applies `mr-[var(--sidebar-width)]` when sidebar is open
- Consider using CSS Grid or flex with dynamic spacing
- Mobile bottom sheet can remain as overlay (acceptable for small screens)

### R3: Enhanced TryIt Component

Extend TryIt to show expected output and allow command editing before execution.

**Acceptance Criteria:**
- New `expectedOutput` prop displays expected terminal output below command
- Expected output styled as muted terminal output (monospace, dimmer color)
- Command is editable in an input field before sending
- "Run" button sends the current input value (not original command)
- Input field shows original command as placeholder/default
- Edit mode is optional - if user doesn't edit, sends original command
- Debounce behavior preserved

**Props:**
```typescript
interface TryItProps {
  readonly command: string
  readonly description?: string
  readonly expectedOutput?: string  // NEW
  readonly editable?: boolean       // NEW (default: true)
}
```

### R4: Per-Tool-Pair Docker Images

Reorganize Docker images to support different tool combinations per lesson.

**Acceptance Criteria:**
- Base image with common Debian setup, non-root user, shell config
- Tool-pair images extend base and install specific tools
- Each tool-pair image pre-configures user identities (git config, jj config)
- Image naming: `toolkata-sandbox:<tool-pair>` (e.g., `toolkata-sandbox:jj-git`)
- `ContainerService` uses tool-pair to select correct image
- Build script to build all images

**Directory Structure:**
```
packages/sandbox-api/docker/
├── base/
│   └── Dockerfile        # Debian, sandbox user, shell
├── tool-pairs/
│   ├── jj-git/
│   │   └── Dockerfile    # FROM base, git + jj
│   └── hg-git/
│       └── Dockerfile    # FROM base, git + hg (future)
├── entrypoint.sh
└── build-images.sh       # Build script
```

### R5: gVisor Runtime Integration

Add gVisor (runsc) as the container runtime for defense-in-depth kernel isolation.

**Acceptance Criteria:**
- `ContainerService` adds `Runtime: "runsc"` to HostConfig when enabled
- Environment variable `SANDBOX_USE_GVISOR` controls feature (default: true in production)
- Graceful fallback to default runtime when gVisor unavailable (development)
- Log warning when gVisor is unavailable but requested
- Oracle Cloud deployment scripts include gVisor installation

**Technical Notes:**
- Add `Runtime` field to HostConfig in `container.ts:116`
- Create config module for sandbox settings
- gVisor adds ~50ms startup latency (acceptable)
- Already documented in PLAN.md but not implemented

## Constraints

- **No breaking changes** to existing MDX content using `<TryIt command="..." />`
- **Mobile behavior unchanged** - bottom sheet can remain as overlay
- **Performance** - shrinking layout must not cause layout thrashing
- **Accessibility** - keyboard navigation must work with shrinking layout
- **Bundle size** - no new heavy dependencies

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Sidebar opens while terminal connecting | Show "Starting..." status, queue commands |
| TryIt clicked while sidebar closing | Reopen sidebar, execute command |
| Session expires while editing TryIt | Show expired state, preserve edited command |
| gVisor unavailable at runtime | Fall back to runc, log warning |
| Docker image missing for tool-pair | Clear error message in API response |
| User resizes window with sidebar open | Content reflows smoothly |

## Out of Scope

- Mobile shrinking layout (bottom sheet overlay is acceptable)
- Multiple concurrent terminal sessions
- Terminal command history persistence across page reloads
- gVisor installation automation (documented in deployment scripts)
- Other tool-pairs beyond jj-git (structure supports future expansion)
