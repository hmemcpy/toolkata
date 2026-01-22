# Terminal Sidebar Specification

## Overview

Refactor the sandbox terminal from a bottom section embedded in each step page to a collapsible right sidebar with `<TryIt />` MDX components that send commands to the terminal. The terminal session persists across step navigation within a tool pairing.

## Requirements

### R1: Collapsible Right Sidebar (Desktop)
- Fixed right sidebar containing the terminal (400px width)
- Sidebar overlays content rather than pushing it (prevents horizontal scroll issues)
- Close button in header
- Status indicator showing connection state
- Footer with Reset button and session timer

### R2: Mobile Bottom Sheet
- Bottom sheet UI for viewports < 1024px (lg breakpoint)
- ~60% viewport height, max 600px
- Drag handle for visual affordance
- Swipe-to-close gesture (threshold: 100px down)

### R3: TryIt MDX Component
- `<TryIt command="..." description="..." />` syntax in MDX
- Displays command in monospace with Run button
- Clicking Run opens sidebar (if closed) and sends command to terminal
- Shows "Sent" feedback briefly (500ms)
- Optional copy-to-clipboard secondary action

### R4: Terminal Persistence
- Terminal session persists across step navigation within `[toolPair]`
- Sidebar open/closed state persists across navigation
- WebSocket connection maintained while navigating
- Session timer continues across navigation

### R5: TerminalContext State Management
- New React context at layout level for terminal state
- State machine: IDLE → CONNECTING → CONNECTED → TIMEOUT_WARNING → EXPIRED/ERROR
- Shared terminal ref for command execution from any component
- `executeCommand(command)` method that opens sidebar if needed

### R6: Floating Toggle Button
- FAB-style button in bottom-right corner
- Shows connection indicator dot when connected
- Hidden when sidebar is open (desktop)
- Visible on all viewports

## Constraints

### Performance
- Lazy-load terminal component (existing pattern)
- No layout shift when sidebar opens (overlay mode)
- Sidebar animation under 300ms

### Accessibility
- `aria-label` on sidebar, toggle button, TryIt component
- Focus trap within sidebar when open
- Return focus to trigger element on close
- Keyboard shortcuts: `t` to toggle, `Esc` to close
- `prefers-reduced-motion` support for animations
- Touch targets >= 44px

### Browser Support
- Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile Safari gesture detection for swipe-to-close

## Edge Cases

### E1: Connection Lost Mid-Session
- Terminal state changes to ERROR
- Sidebar stays open with error message
- User can click Retry or close sidebar

### E2: Session Expired While Sidebar Closed
- Next time sidebar opens, show EXPIRED state
- Prompt user to restart session

### E3: Rapid TryIt Clicks
- Debounce command execution (500ms)
- Show "Sent" state immediately, don't queue

### E4: Navigation During Connection
- WebSocket maintained via layout-level provider
- Connection continues during client-side navigation
- Full page reload destroys session (expected behavior)

### E5: TryIt Before Terminal Started
- TryIt click starts terminal session automatically
- Opens sidebar and shows CONNECTING state
- Command queued until CONNECTED, then executed

## Out of Scope

- Per-step terminal sessions (single session per tool pairing)
- Terminal command history across sessions
- Multiple terminal tabs
- Terminal split view
- Drag to resize sidebar width
- Persisting session across browser sessions (WebSocket is ephemeral)
