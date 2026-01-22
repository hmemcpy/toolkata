# Terminal Sidebar Refactoring Plan

## Overview
Refactor the sandbox terminal from a bottom section to a collapsible right sidebar with "TryIt" MDX components that send commands to the terminal.

## Requirements
- Collapsible right sidebar containing the terminal (desktop: 400px fixed width)
- Mobile: Bottom sheet (~60% height) instead of sidebar
- `<TryIt command="..." />` MDX component with Play button
- Clicking Play opens sidebar (if closed) and sends command to terminal
- Terminal session persists across step navigation

---

## Design Tokens

Add to `globals.css`:
```css
/* Sidebar */
--sidebar-width: 400px;
--sidebar-z-index: 40;
--backdrop-z-index: 30;
--toggle-z-index: 50;

/* Animations */
--transition-sidebar: 300ms ease-in-out;
```

---

## Architecture

### New Context: `TerminalContext`
```typescript
type TerminalState =
  | "IDLE"              // Waiting for user to start
  | "CONNECTING"        // Creating session, connecting WS
  | "CONNECTED"         // Active session
  | "TIMEOUT_WARNING"   // <60 seconds remaining
  | "EXPIRED"           // Session died or timeout
  | "ERROR"             // Connection failed

interface TerminalContextValue {
  // Sidebar state
  isOpen: boolean
  openSidebar: () => void
  closeSidebar: () => void
  toggleSidebar: () => void

  // Terminal ref for command execution
  terminalRef: RefObject<InteractiveTerminalRef | null>

  // Execute command - opens sidebar if closed, then sends command
  executeCommand: (command: string) => void

  // Terminal connection state (full state machine)
  terminalState: TerminalState
  setTerminalState: (state: TerminalState) => void

  // Session timer
  sessionTimeRemaining: number | null  // seconds, null if not connected
}
```

### Component Flow
```
TerminalContext (in Providers at layout level)
        |
+-------+-------+-------+
|       |       |       |
TryIt   Toggle  Sidebar Header
(MDX)   Button  Close   Close
        |       |       |
        +----> InteractiveTerminal <----+
              (via shared ref)
```

---

## Wireframes

### Desktop Sidebar (400px, fixed right)
```
┌──────────────────────────────────────────┐
│ Terminal                          [✕]    │ ← Header 48px
├──────────────────────────────────────────┤
│ SANDBOX                    ● Connected   │ ← Status bar
├──────────────────────────────────────────┤
│                                          │
│ sandbox@toolkata:~$ jj log               │
│ @  qpvuntsm ...                          │
│ │  (empty)                               │
│ ○  zzzzzzzz root()                       │
│                                          │
│ sandbox@toolkata:~$ █                    │ ← xterm.js
│                                          │
│                                          │
│                                          │
├──────────────────────────────────────────┤
│ [Reset]                  Session: 4:32   │ ← Footer 36px
└──────────────────────────────────────────┘
```

### Mobile Bottom Sheet (60vh)
```
┌──────────────────────────────────────────┐
│              ───────                     │ ← Drag handle 24px
├──────────────────────────────────────────┤
│ Terminal              ● Connected  [✕]   │
├──────────────────────────────────────────┤
│                                          │
│ $ jj log                                 │
│ @  qpvuntsm ...                          │
│ $ █                                      │
│                                          │
├──────────────────────────────────────────┤
│ [Reset]                  Session: 4:32   │
└──────────────────────────────────────────┘
```

### TryIt Component
```
Default state:
┌──────────────────────────────────────────────────────────┐
│ $ echo 'hello' > file.txt                    [▶ Run]    │
├──────────────────────────────────────────────────────────┤
│ Create a file with "hello" content                       │
└──────────────────────────────────────────────────────────┘

Executing state (brief flash, 500ms):
┌──────────────────────────────────────────────────────────┐
│ $ echo 'hello' > file.txt                    [✓ Sent]   │
├──────────────────────────────────────────────────────────┤
│ Create a file with "hello" content                       │
└──────────────────────────────────────────────────────────┘

Specifications:
- Border: 1px solid var(--color-border)
- Background: var(--color-surface)
- Code font: var(--font-mono), var(--font-size-sm)
- Run button: var(--color-accent) bg, min-height 44px, min-width 80px
- Description: var(--font-size-xs), var(--color-text-muted)
- Hover: border-color var(--color-border-focus)
- Focus: var(--focus-ring)
```

---

## Files to Create

### 1. `contexts/TerminalContext.tsx`
- Context definition with sidebar state, terminal ref, and full state machine
- Export `useTerminalContext()` hook

### 2. `components/TerminalProvider.tsx`
- Provider managing sidebar open/closed state
- Holds ref to terminal
- Manages terminal state machine (IDLE → CONNECTING → CONNECTED, etc.)
- Session timer countdown
- `executeCommand()` opens sidebar then calls `insertCommand()`
- Focus management: auto-focus terminal or close button when opening

### 3. `components/ui/TerminalSidebar.tsx`
- Fixed right sidebar (desktop lg+)
- Contains lazy-loaded InteractiveTerminal
- Header with close button and status indicator
- Footer with Reset button and session timer
- **Accessibility:**
  - `aria-label="Terminal sidebar"`
  - `aria-hidden={!isOpen}`
  - `id="terminal-sidebar"` (for aria-controls)
  - Focus trap when open
  - Return focus to trigger element on close

### 4. `components/ui/MobileBottomSheet.tsx`
- Bottom sheet for mobile/tablet (< lg)
- ~60% viewport height, max 600px
- Drag handle for visual affordance
- Swipe-to-close gesture (threshold: 100px down, velocity > 0.5)
- **Accessibility:**
  - `role="dialog"`
  - `aria-modal="true"`
  - `aria-label="Terminal"`
  - Focus trap when open
  - Return focus to trigger on close

### 5. `components/ui/TryIt.tsx`
- MDX component: displays command + Run button
- Calls `executeCommand()` on click
- Shows command in monospace, green Run button
- Optional copy-to-clipboard secondary action
- **Accessibility:**
  - `aria-label={`Run command: ${command}`}`
  - Min touch target: 44px height
  - Visible focus state

### 6. `components/ui/TerminalToggle.tsx`
- Floating button (bottom-right) to open terminal
- Shows connection indicator dot when connected
- Hidden when sidebar is open (desktop)
- **Accessibility:**
  - `aria-label={isOpen ? "Close terminal" : "Open terminal"}`
  - `aria-expanded={isOpen}`
  - `aria-controls="terminal-sidebar"`
  - Min touch target: 56px (FAB standard)

---

## Files to Modify

### `globals.css`
- Add sidebar design tokens (see Design Tokens section)
- Add `prefers-reduced-motion` handling for sidebar animations

### `components/Providers.tsx`
- Add `TerminalProvider` wrapping children

### `app/[toolPair]/layout.tsx`
- Add `<TerminalSidebar />` at layout level (for persistence)
- Content layout: sidebar overlays content (no reflow to avoid horizontal scroll issues)

### `components/ui/InteractiveTerminal.tsx`
- Add `onStateChange?: (state: TerminalState) => void` prop
- Expose session time remaining

### `components/ui/StepPageClientWrapper.tsx`
- Remove `suggestedCommands` prop
- Remove "Try It Yourself" section with `TerminalWithSuggestionsWrapper`

### `app/[toolPair]/[step]/page.tsx`
- Remove `suggestedCommands` extraction from frontmatter
- Remove passing it to `StepPageClientWrapper`

### `hooks/useKeyboardNavigation.ts`
- Add `t` shortcut to toggle terminal
- Add `Esc` to close sidebar (when sidebar is focused)
- Ensure shortcuts don't fire when terminal input is focused

### MDX component registration
- Register `TryIt` component in mdxComponents

---

## Implementation Order

### Phase 1: Foundation
1. Add design tokens to `globals.css`
2. Create `TerminalContext.tsx` with full state machine
3. Create `TerminalProvider.tsx` with focus management
4. Update `Providers.tsx` to include TerminalProvider

### Phase 2: Sidebar UI
5. Create `TerminalSidebar.tsx` (desktop) with accessibility attrs
6. Create `MobileBottomSheet.tsx` (mobile) with swipe gesture
7. Create `TerminalToggle.tsx` (FAB button)

### Phase 3: Layout Integration
8. Update `app/[toolPair]/layout.tsx` - add sidebar (overlay mode)
9. Update `InteractiveTerminal.tsx` - add state change callback

### Phase 4: TryIt Component
10. Create `TryIt.tsx` MDX component with 44px touch targets
11. Register in mdxComponents

### Phase 5: Cleanup
12. Update `StepPageClientWrapper.tsx` - remove bottom terminal
13. Update `page.tsx` - remove suggestedCommands logic

### Phase 6: Polish & Accessibility
14. Add keyboard shortcuts (`t` toggle, `Esc` close)
15. Add `prefers-reduced-motion` handling
16. Focus management testing
17. Screen reader testing (VoiceOver, NVDA)

---

## Accessibility Checklist

### Keyboard Navigation
| Key | Action | Context |
|-----|--------|---------|
| `t` | Toggle terminal | When not in terminal input |
| `Esc` | Close sidebar | When sidebar is open |
| `Tab` | Move through focusable elements | Trapped within sidebar when open |
| `Shift+Tab` | Move backwards | Trapped within sidebar when open |

### ARIA Attributes
- **TerminalSidebar**: `aria-label`, `aria-hidden`, `id`
- **MobileBottomSheet**: `role="dialog"`, `aria-modal="true"`, `aria-label`
- **TerminalToggle**: `aria-label`, `aria-expanded`, `aria-controls`
- **TryIt Run button**: `aria-label`

### Focus Management
- Opening sidebar: Focus moves to close button or terminal
- Closing sidebar: Focus returns to trigger element (toggle button or TryIt button)
- Focus trap: Tab cycles within sidebar when open

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  .terminal-sidebar,
  .mobile-bottom-sheet {
    transition: none;
  }
}
```

---

## MDX Usage (After Implementation)

```mdx
# Creating Commits

<SideBySide gitCode="git commit" jjCode="jj describe" />

Try these commands:

<TryIt command="echo 'hello' > file.txt" description="Create a file" />
<TryIt command="jj status" description="See the change" />
<TryIt command="jj describe -m 'Add file'" />
```

---

## Responsive Behavior

| Breakpoint | Terminal UI | Toggle Button | Content Layout |
|------------|-------------|---------------|----------------|
| < lg (1024px) | Bottom sheet 60vh | Visible (bottom-right) | Full width |
| >= lg | Right sidebar 400px | Hidden when sidebar open | Full width (sidebar overlays) |

**Note**: Sidebar overlays content rather than pushing it to avoid horizontal scroll issues at narrow desktop widths (1024-1400px).

---

## Verification Checklist

### Functional
- [ ] Desktop: Open terminal via toggle button, verify sidebar slides in from right
- [ ] Desktop: Click TryIt Run button, verify sidebar opens and command appears
- [ ] Mobile: Verify bottom sheet appears at 60% height
- [ ] Mobile: Swipe down to close bottom sheet
- [ ] Persistence: Navigate between steps, verify terminal stays open and connected
- [ ] Session timer: Verify countdown displays and updates

### Keyboard
- [ ] Press `t` to toggle terminal (when not in terminal input)
- [ ] Press `Esc` to close sidebar
- [ ] Tab through sidebar elements (should trap focus)
- [ ] Shift+Tab backwards through sidebar

### Accessibility
- [ ] Screen reader announces sidebar open/close
- [ ] Screen reader announces TryIt button purpose
- [ ] Focus returns to trigger on close
- [ ] Works with `prefers-reduced-motion: reduce`
- [ ] All touch targets >= 44px

### Visual
- [ ] Sidebar uses correct design tokens
- [ ] Status indicator matches terminal state
- [ ] TryIt component matches wireframe
- [ ] No horizontal scroll at any viewport width
