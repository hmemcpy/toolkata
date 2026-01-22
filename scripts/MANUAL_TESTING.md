# Manual Testing Guide for toolkata

This guide provides step-by-step instructions for completing the remaining verification tasks that require browser-based testing.

---

## Prerequisites

### Required Software
- Docker Desktop running (for sandbox testing)
- Modern browser (Chrome/Firefox/Safari with DevTools)
- Terminal application

### Setup Commands

```bash
# Terminal 1: Start the frontend
cd /Users/hmemcpy/git/jj-kata
bun run dev

# Terminal 2: Start the sandbox API (if testing sandbox features)
cd /Users/hmemcpy/git/jj-kata/packages/sandbox-api
bun run dev
```

---

## Task 12.5: Manual Test Sandbox Connection

### Objective
Verify that the sandbox API can create containers, execute commands, and handle session lifecycle.

### Steps

1. **Start the sandbox API**
   ```bash
   cd /Users/hmemcpy/git/jj-kata/packages/sandbox-api
   bun run dev
   ```
   Expected output: Server listening on port 3001

2. **Start the frontend**
   ```bash
   cd /Users/hmemcpy/git/jj-kata
   bun run dev
   ```

3. **Navigate to a step page**
   - Open http://localhost:3000/jj-git/3
   - Scroll to the "Try It" section

4. **Test container creation**
   - Click "Start Terminal" button
   - Verify status changes: IDLE → CONNECTING → CONNECTED
   - Container should start within 2 seconds
   - Status indicator should turn green (● Connected)

5. **Test command execution**
   - Type `jj log` and press Enter
   - Expected output: Log showing @ commit and root() commit
   - Type `jj status` and press Enter
   - Expected output: "No working copy changes"
   - Type `echo "test" > file.txt` and press Enter
   - Type `jj status` and press Enter
   - Expected output: Shows file.txt as added

6. **Test session timer**
   - Verify session timer displays (e.g., "Session: 4:32 / 5:00")
   - Timer should count down
   - At 1 minute remaining, warning should appear

7. **Test reset functionality**
   - Click "Reset" button
   - Confirm reset when prompted
   - Container should be destroyed and new one created
   - Previous changes should be gone

8. **Test session expiry** (skip for faster testing)
   - Wait 5 minutes without typing
   - Session should expire
   - "Session expired" message should appear
   - "Restart Terminal" button should be shown

### Expected Results
- [ ] Container starts within 2 seconds
- [ ] Commands execute correctly (jj log, jj status, etc.)
- [ ] Session timer counts down properly
- [ ] Reset button destroys and recreates container
- [ ] Session expiry shows proper message

### Troubleshooting

**Error: "Could not connect to sandbox"**
- Check Docker is running: `docker ps`
- Check sandbox-api is running on port 3001
- Check browser console for WebSocket errors

**Error: "Rate limited"**
- Clear localStorage and try again
- Wait for rate limit to expire (1 hour)

---

## Task 12.6: Verify Progress Persistence

### Objective
Ensure user progress is saved to localStorage and persists across page refreshes and browser restarts.

### Steps

1. **Clear existing progress**
   - Open http://localhost:3000/jj-git
   - Open DevTools (F12 or Cmd+Option+I)
   - Go to Application → Local Storage → http://localhost:3000
   - Find key `toolkata_progress`
   - Delete it (or run `localStorage.clear()` in Console)

2. **Verify initial state**
   - Refresh page
   - All steps should show ○ (not started)
   - ProgressBar should show 0/12

3. **Mark steps as complete**
   - Navigate to http://localhost:3000/jj-git/1
   - Click "Mark Complete" or "Next Step →"
   - Repeat for steps 2, 3, 4

4. **Verify localStorage updated**
   - In DevTools Console, run:
   ```javascript
   JSON.parse(localStorage.getItem('toolkata_progress'))
   ```
   - Expected output: `{ "jj-git": { "completedSteps": [1,2,3,4], "currentStep": 5, "lastVisited": "..." } }`

5. **Test page refresh persistence**
   - Refresh page (F5 or Cmd+R)
   - Steps 1-4 should show ✓ (completed)
   - Step 5 should show → (current)
   - ProgressBar should show 4/12

6. **Test navigation persistence**
   - Go to home page (http://localhost:3000)
   - jj-git card should show progress bar (4/12)
   - "Continue from Step 5 →" button should be shown
   - Click it
   - Should navigate to step 5

7. **Test browser restart persistence**
   - Close browser completely
   - Reopen browser
   - Go to http://localhost:3000/jj-git
   - Progress should still be saved (4/12)

8. **Test reset functionality**
   - On overview page, click "Reset Progress"
   - Confirm reset
   - All steps should show ○ (not started)
   - localStorage `toolkata_progress` should be updated

### Expected Results
- [ ] Progress saves to localStorage correctly
- [ ] Progress persists across page refreshes
- [ ] Progress survives browser restart
- [ ] Home page shows current progress
- [ ] "Continue" button navigates to current step
- [ ] Reset clears progress correctly

### Troubleshooting

**Progress not saving**
- Check browser has localStorage enabled
- Check browser console for errors
- Verify not in private browsing mode

**Progress lost after refresh**
- Check if code path calls `markComplete` correctly
- Verify localStorage writes before navigation

---

## Task 12.7: Verify Fallback Mode

### Objective
Ensure the static fallback mode activates gracefully when sandbox API is unavailable.

### Steps

1. **Start frontend only (no sandbox API)**
   ```bash
   cd /Users/hmemcpy/git/jj-kata
   bun run dev
   ```
   - Do NOT start the sandbox-api server

2. **Navigate to a step page**
   - Open http://localhost:3000/jj-git/3
   - Scroll to "Try It" section

3. **Test automatic fallback**
   - Click "Start Terminal" button
   - Should show "Connecting..." briefly
   - Should then show error state with message:
     "Interactive sandbox is currently unavailable."
   - Should show static code blocks with copy buttons
   - Should have link to cheat sheet

4. **Test copy functionality in fallback**
   - Click copy button on code block
   - Code should be copied to clipboard
   - Button should show checkmark briefly

5. **Test with API blocked (network level)**
   - Start sandbox-api: `cd packages/sandbox-api && bun run dev`
   - Open browser DevTools → Network tab
   - Right-click → Block "localhost:3001"
   - Try to start terminal
   - Should show same fallback mode

6. **Test with invalid API URL**
   - Close sandbox-api server
   - In browser Console, run:
   ```javascript
   localStorage.setItem('toolkata_sandbox_api_url', 'http://localhost:9999')
   ```
   - Refresh page
   - Try to start terminal
   - Should show fallback mode

7. **Test recovery**
   - Unblock localhost:3001 (if blocked)
   - Start sandbox-api server
   - Click "Retry" button in error state
   - Terminal should connect successfully
   - Fallback should disappear

8. **Verify static content quality**
   - All commands from step should be visible
   - Code blocks should be readable
   - Copy buttons should work
   - Link to cheat sheet should navigate correctly

### Expected Results
- [ ] Fallback activates when API unavailable
- [ ] Static code blocks display correctly
- [ ] Copy buttons work in fallback mode
- [ ] Error message is clear and helpful
- [ ] Link to cheat sheet works
- [ ] Retry button attempts reconnection
- [ ] Terminal recovers when API becomes available

### Troubleshooting

**Fallback not activating**
- Verify sandbox-api is NOT running
- Check browser network tab for failed requests
- Check browser console for errors

**Copy buttons not working**
- Check browser permissions for clipboard
- Try HTTPS (clipboard API requires HTTPS or localhost)

---

## Additional Manual Tests

### Accessibility (WCAG 2.1 AA)

**Keyboard Navigation**
1. Press Tab - focus should move to next interactive element
2. Press Shift+Tab - focus should move to previous element
3. Press Enter/Space - should activate focused button/link
4. On step pages, press ← and → arrow keys - should navigate steps
5. Press ? - should open keyboard shortcuts modal
6. Press Esc - should close modals, exit terminal focus

**Focus Indicators**
1. Tab through all interactive elements
2. Each should show green focus ring (2px outline)
3. Focus should be visible on all buttons, links, inputs

**Touch Targets**
1. Open DevTools → Toggle device toolbar
2. Set to mobile (e.g., iPhone SE - 375px)
3. All buttons should be ≥ 44px tall/wide
4. Check navigation buttons, comparison cards, copy buttons

### Responsive Design

**320px (Mobile)**
```javascript
// In browser console:
document.body.style.maxWidth = '320px'
```
- No horizontal scroll
- Content stacks vertically
- Terminal is full width
- Navigation is accessible

**768px (Tablet)**
```javascript
document.body.style.maxWidth = '768px'
```
- SideBySide shows side-by-side
- Navigation shows text + icons
- Layout adapts appropriately

**200% Zoom**
- Set browser zoom to 200%
- Layout remains usable
- Text doesn't overflow containers
- All functionality still accessible

---

## Test Completion Checklist

After completing all manual tests, update IMPLEMENTATION_PLAN.md:

```markdown
- [x] **12.5** Manual test sandbox connection
  - Container starts within 2s ✓
  - Commands execute correctly ✓
  - Session expires after timeout ✓

- [x] **12.6** Verify progress persistence
  - Progress saves to localStorage ✓
  - Progress persists across refreshes ✓
  - Progress survives browser restart ✓

- [x] **12.7** Verify fallback mode
  - Fallback activates when API unavailable ✓
  - Static mode shows copyable commands ✓
  - Retry attempts reconnection ✓
```

---

## Notes

- Tests should be run in Chrome/Firefox/Safari to ensure cross-browser compatibility
- Document any bugs found in IMPLEMENTATION_PLAN.md "Discoveries & Notes" section
- Take screenshots of any failures for documentation
- Report any accessibility issues found during testing
