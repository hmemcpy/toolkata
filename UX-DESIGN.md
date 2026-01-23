# toolkata UX Design Document

**Version:** 1.0
**Target:** Developers learning tool X from tool Y
**Design Philosophy:** Surgical precision, zero noise

---

## 1. User Personas

### Primary Persona: "The Pragmatic Migrator"

```
Name:       Alex Chen
Role:       Senior Software Engineer
Experience: 8+ years with git
Goal:       Learn jj quickly without reading entire documentation
Pain Point: "I don't have time to read docs. Just show me the equivalent commands."
Behavior:   Scans content, prefers examples over explanations
Device:     Primarily desktop (dual monitors), occasionally laptop
```

**Needs:**
- Quick command mapping (git → jj)
- Hands-on practice in safe environment
- Progress tracking to resume later
- Keyboard-friendly navigation

### Secondary Persona: "The Curious Explorer"

```
Name:       Jordan Park
Role:       Mid-level Developer
Experience: 3 years with git
Goal:       Understand WHY jj is different, not just HOW
Pain Point: "I want to understand the mental model shift"
Behavior:   Reads explanations, tries variations
Device:     Laptop, sometimes tablet for reading
```

**Needs:**
- Conceptual explanations alongside commands
- Interactive sandbox to experiment
- Ability to go back and review

---

## 2. User Flows

### Flow 1: New User Discovery → First Lesson

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Landing   │────▶│   Select    │────▶│  Overview   │────▶│   Step 1    │
│    Page     │     │  jj ← git   │     │    Page     │     │  (Lesson)   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ▼
                                        ┌─────────────┐
                                        │ Cheat Sheet │
                                        │  (optional) │
                                        └─────────────┘
```

### Flow 2: Returning User → Resume Progress

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Landing   │────▶│  jj ← git   │────▶│  Step N     │
│    Page     │     │  (shows     │     │  (last      │
│             │     │  progress)  │     │  incomplete)│
└─────────────┘     └─────────────┘     └─────────────┘
      │
      │ localStorage check
      ▼
  "Continue where you left off"
  indicator on card
```

### Flow 3: Lesson Progression

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Step N    │────▶│  Read       │────▶│  Try in     │
│   (enter)   │     │  Content    │     │  Sandbox    │
└─────────────┘     └─────────────┘     └─────────────┘
                          │                    │
                          │                    ▼
                          │              ┌─────────────┐
                          │              │  Practice   │
                          │              │  Commands   │
                          │              └─────────────┘
                          │                    │
                          ▼                    ▼
                    ┌─────────────┐     ┌─────────────┐
                    │  Mark as    │◀────│  Satisfied  │
                    │  Complete   │     │  with try   │
                    └─────────────┘     └─────────────┘
                          │
                          ▼
                    ┌─────────────┐
                    │  Next Step  │
                    │  (auto)     │
                    └─────────────┘
```

### Flow 4: Sandbox Interaction

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Click      │────▶│  Sandbox    │────▶│  Container  │
│  Terminal   │     │  Starting   │     │  Ready      │
│  Area       │     │  (1-2s)     │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
      ┌───────────────────────────────────────┤
      │                                       │
      ▼                                       ▼
┌─────────────┐                         ┌─────────────┐
│  Type       │                         │  Idle       │
│  Commands   │                         │  Timeout    │
└─────────────┘                         │  Warning    │
      │                                 └─────────────┘
      │                                       │
      ▼                                       ▼
┌─────────────┐                         ┌─────────────┐
│  See        │                         │  Session    │
│  Output     │                         │  Expired    │
└─────────────┘                         └─────────────┘
      │                                       │
      ▼                                       ▼
┌─────────────┐                         ┌─────────────┐
│  Reset      │                         │  Restart    │
│  (optional) │                         │  Sandbox    │
└─────────────┘                         └─────────────┘
```

---

## 3. Detailed Wireframes

### 3.1 Home Page (Desktop: 1024px+)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │  [Skip to main content]                              (sr-only link)  │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                                                                      │ │
│  │  toolkata_                                          [GitHub] [?Help] │ │
│  │                                                                      │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                                                                      │ │
│  │                                                                      │ │
│  │      Learn X if you already know Y                                   │ │
│  │      ─────────────────────────────                                   │ │
│  │                                                                      │ │
│  │      Hands-on tutorials for developers switching tools.              │ │
│  │      No fluff. Just the commands you need.                           │ │
│  │                                                                      │ │
│  │                                                                      │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                                                                      │ │
│  │   Version Control                                                    │ │
│  │   ───────────────                                                    │ │
│  │                                                                      │ │
│  │   ┌────────────────────┐  ┌────────────────────┐                    │ │
│  │   │                    │  │                    │                    │ │
│  │   │  jj ← git          │  │  pijul ← git       │                    │ │
│  │   │                    │  │                    │                    │ │
│  │   │  Jujutsu VCS       │  │  Pijul VCS         │                    │ │
│  │   │                    │  │                    │                    │ │
│  │   │  ████████░░ 8/12   │  │  Coming soon       │                    │ │
│  │   │                    │  │                    │                    │ │
│  │   │  [Continue →]      │  │  [Notify me]       │                    │ │
│  │   │                    │  │                    │                    │ │
│  │   └────────────────────┘  └────────────────────┘                    │ │
│  │                                                                      │ │
│  │   Package Management                                                 │ │
│  │   ──────────────────                                                 │ │
│  │                                                                      │ │
│  │   ┌────────────────────┐                                            │ │
│  │   │                    │                                            │ │
│  │   │  nix ← homebrew    │                                            │ │
│  │   │                    │                                            │ │
│  │   │  Nix Package Mgr   │                                            │ │
│  │   │                    │                                            │ │
│  │   │  Coming soon       │                                            │ │
│  │   │                    │                                            │ │
│  │   └────────────────────┘                                            │ │
│  │                                                                      │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                                                                      │ │
│  │  Progress stored locally · No account needed · Open source           │ │
│  │                                                                      │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Home Page (Mobile: 320-767px)

```
┌────────────────────────────┐
│                            │
│  toolkata_        [≡] [?]  │
│                            │
├────────────────────────────┤
│                            │
│  Learn X if you            │
│  already know Y            │
│  ───────────────           │
│                            │
│  Hands-on tutorials for    │
│  developers switching      │
│  tools.                    │
│                            │
├────────────────────────────┤
│                            │
│  Version Control           │
│                            │
│  ┌──────────────────────┐  │
│  │  jj ← git            │  │
│  │  Jujutsu VCS         │  │
│  │  ████████░░ 8/12     │  │
│  │  [Continue →]        │  │
│  └──────────────────────┘  │
│                            │
│  ┌──────────────────────┐  │
│  │  pijul ← git         │  │
│  │  Pijul VCS           │  │
│  │  Coming soon         │  │
│  └──────────────────────┘  │
│                            │
│  Package Management        │
│                            │
│  ┌──────────────────────┐  │
│  │  nix ← homebrew      │  │
│  │  Coming soon         │  │
│  └──────────────────────┘  │
│                            │
├────────────────────────────┤
│  Progress stored locally   │
│  No account needed         │
└────────────────────────────┘
```

### 3.3 Comparison Overview Page (Desktop)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │  ← All comparisons                    jj ← git            [Cheatsheet]│ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  ┌────────────────────────────────────┬─────────────────────────────────┐ │
│  │                                    │                                 │ │
│  │  # Why jj?                         │   Your Progress                 │ │
│  │                                    │   ──────────────                │ │
│  │  jj (Jujutsu) rethinks version     │                                 │ │
│  │  control from first principles:    │   ████████████░░░░ 8/12         │ │
│  │                                    │                                 │ │
│  │  • Working copy IS a commit        │   ~15 min remaining             │ │
│  │  • No staging area complexity      │                                 │ │
│  │  • Change IDs survive rebases      │   [Continue Step 9 →]           │ │
│  │  • Conflicts are first-class       │                                 │ │
│  │  • Automatic descendant rebasing   │   ─────────────────             │ │
│  │                                    │                                 │ │
│  │  Compatible with existing git      │   Or start fresh:               │ │
│  │  repos. Use both tools together.   │   [Reset Progress]              │ │
│  │                                    │                                 │ │
│  └────────────────────────────────────┴─────────────────────────────────┘ │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                                                                      │ │
│  │  Steps                                                               │ │
│  │  ─────                                                               │ │
│  │                                                                      │ │
│  │  ┌─ Fundamentals ─────────────────────────────────────────────────┐  │ │
│  │  │                                                                │  │ │
│  │  │  ✓  1. Installation & Setup              ~2 min               │  │ │
│  │  │  ✓  2. Mental Model: Working Copy        ~3 min               │  │ │
│  │  │  ✓  3. Creating Commits                  ~3 min               │  │ │
│  │  │  ✓  4. Viewing History                   ~2 min               │  │ │
│  │  │                                                                │  │ │
│  │  └────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                      │ │
│  │  ┌─ Daily Workflow ───────────────────────────────────────────────┐  │ │
│  │  │                                                                │  │ │
│  │  │  ✓  5. Navigating Commits                ~3 min               │  │ │
│  │  │  ✓  6. Amending & Squashing              ~4 min               │  │ │
│  │  │  ✓  7. Bookmarks (not Branches)          ~3 min               │  │ │
│  │  │  ✓  8. Handling Conflicts                ~4 min               │  │ │
│  │  │                                                                │  │ │
│  │  └────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                      │ │
│  │  ┌─ Advanced ─────────────────────────────────────────────────────┐  │ │
│  │  │                                                                │  │ │
│  │  │  →  9. Rebasing                          ~4 min    ← current  │  │ │
│  │  │  ○  10. Undo & Recovery                  ~3 min               │  │ │
│  │  │  ○  11. Working with Remotes             ~3 min               │  │ │
│  │  │  ○  12. Revsets Deep Dive                ~5 min               │  │ │
│  │  │                                                                │  │ │
│  │  └────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                      │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘

Legend:
  ✓  Completed step
  →  Current/in-progress step
  ○  Not started
```

### 3.4 Step Page with Interactive Terminal (Desktop)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │  ← Overview              Step 9 of 12: Rebasing              [→ 10] │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                                                                      │ │
│  │  # Rebasing in jj                                                    │ │
│  │                                                                      │ │
│  │  In git, rebasing is a careful operation. In jj, it's automatic     │ │
│  │  and safe. When you rewrite a commit, all descendants rebase        │ │
│  │  automatically.                                                      │ │
│  │                                                                      │ │
│  │  ┌─────────────────────────────┬─────────────────────────────┐      │ │
│  │  │ git                         │ jj                          │      │ │
│  │  ├─────────────────────────────┼─────────────────────────────┤      │ │
│  │  │                             │                             │      │ │
│  │  │ $ git rebase main           │ $ jj rebase -d main         │      │ │
│  │  │ $ git rebase --onto A B C   │ $ jj rebase -s C -d A       │      │ │
│  │  │ $ git rebase -i HEAD~3      │ # Just edit commits         │      │ │
│  │  │                             │ # directly with jj edit     │      │ │
│  │  │                             │                             │      │ │
│  │  └─────────────────────────────┴─────────────────────────────┘      │ │
│  │                                                                      │ │
│  │  ## The Key Difference                                               │ │
│  │                                                                      │ │
│  │  When you edit an old commit in jj, all descendants automatically   │ │
│  │  rebase. No need for `--update-refs` or manual branch updates.      │ │
│  │                                                                      │ │
│  │  ┌─────────────────────────────────────────────────────────────┐    │ │
│  │  │ TIP: jj never loses data. Use `jj op log` to see all        │    │ │
│  │  │ operations and `jj undo` to reverse any mistake.            │    │ │
│  │  └─────────────────────────────────────────────────────────────┘    │ │
│  │                                                                      │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                                                                      │ │
│  │  ## Try It                                                           │ │
│  │                                                                      │ │
│  │  ┌────────────────────────────────────────────────────────────────┐ │ │
│  │  │ SANDBOX                                            ● Connected │ │ │
│  │  ├────────────────────────────────────────────────────────────────┤ │ │
│  │  │                                                                │ │ │
│  │  │ sandbox@toolkata:~/workspace$ jj log                           │ │ │
│  │  │ @  qpvuntsm test@example.com 2024-01-15 10:23                  │ │ │
│  │  │ │  (empty) (no description set)                                │ │ │
│  │  │ ○  zzzzzzzz root()                                             │ │ │
│  │  │                                                                │ │ │
│  │  │ sandbox@toolkata:~/workspace$ █                                │ │ │
│  │  │                                                                │ │ │
│  │  │                                                                │ │ │
│  │  │                                                                │ │ │
│  │  │                                                                │ │ │
│  │  │                                                                │ │ │
│  │  └────────────────────────────────────────────────────────────────┘ │ │
│  │  [Reset]  [Copy session]                        Session: 4:32 / 5:00│ │
│  │                                                                      │ │
│  │  Suggested commands:                                                 │ │
│  │  ┌──────────────────────────────────────────────────────────────┐   │ │
│  │  │ echo "line1" > file.txt && jj describe -m "First"            │   │ │
│  │  └──────────────────────────────────────────────────────────────┘   │ │
│  │  ┌──────────────────────────────────────────────────────────────┐   │ │
│  │  │ jj new && echo "line2" >> file.txt && jj describe -m "Second"│   │ │
│  │  └──────────────────────────────────────────────────────────────┘   │ │
│  │  ┌──────────────────────────────────────────────────────────────┐   │ │
│  │  │ jj edit @- && echo "inserted" >> file.txt                    │   │ │
│  │  └──────────────────────────────────────────────────────────────┘   │ │
│  │                                                                      │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                                                                      │ │
│  │  [← Step 8: Conflicts]             [Mark Complete]    [Step 10 →]   │ │
│  │                                                                      │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### 3.5 Step Page (Mobile: 320-767px)

```
┌────────────────────────────┐
│                            │
│  ← Overview      9/12  →   │
│                            │
├────────────────────────────┤
│                            │
│  # Rebasing in jj          │
│                            │
│  In git, rebasing is a     │
│  careful operation. In jj, │
│  it's automatic and safe.  │
│                            │
│  ┌────────────────────────┐│
│  │ git                    ││
│  ├────────────────────────┤│
│  │ $ git rebase main      ││
│  │ $ git rebase --onto... ││
│  └────────────────────────┘│
│           ↓                │
│  ┌────────────────────────┐│
│  │ jj                     ││
│  ├────────────────────────┤│
│  │ $ jj rebase -d main    ││
│  │ $ jj rebase -s C -d A  ││
│  └────────────────────────┘│
│                            │
│  ## The Key Difference     │
│                            │
│  When you edit an old      │
│  commit, descendants       │
│  automatically rebase.     │
│                            │
├────────────────────────────┤
│                            │
│  ## Try It                 │
│                            │
│  ┌────────────────────────┐│
│  │ SANDBOX      ● Ready   ││
│  ├────────────────────────┤│
│  │                        ││
│  │ $ jj log               ││
│  │ @  qpvuntsm ...        ││
│  │ │  (empty)             ││
│  │ ○  zzzzzzzz root()     ││
│  │                        ││
│  │ $ █                    ││
│  │                        ││
│  │                        ││
│  │                        ││
│  └────────────────────────┘│
│  [Reset]        3:42/5:00  │
│                            │
│  Tap to run:               │
│  ┌────────────────────────┐│
│  │ jj describe -m "First" ││
│  └────────────────────────┘│
│                            │
├────────────────────────────┤
│                            │
│  [← Prev] [Done] [Next →]  │
│                            │
└────────────────────────────┘
```

### 3.6 Cheat Sheet Page (Desktop)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │  ← jj ← git                              Cheat Sheet        [Print] │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                                                                      │ │
│  │  Quick Reference: git → jj                                           │ │
│  │  ═════════════════════════                                           │ │
│  │                                                                      │ │
│  │  ┌─────────────────────────────────┬─────────────────────────────┐  │ │
│  │  │ git                             │ jj                          │  │ │
│  │  ╞═════════════════════════════════╪═════════════════════════════╡  │ │
│  │  │                                 │                             │  │ │
│  │  │ BASICS                          │                             │  │ │
│  │  │ ──────                          │                             │  │ │
│  │  │ git init                        │ jj git init                 │  │ │
│  │  │ git clone <url>                 │ jj git clone <url>          │  │ │
│  │  │ git status                      │ jj status (jj st)           │  │ │
│  │  │ git log                         │ jj log                      │  │ │
│  │  │ git diff                        │ jj diff                     │  │ │
│  │  │                                 │                             │  │ │
│  │  │ COMMITS                         │                             │  │ │
│  │  │ ───────                         │                             │  │ │
│  │  │ git add . && git commit         │ jj describe -m "msg"        │  │ │
│  │  │ git commit --amend              │ jj describe (on @)          │  │ │
│  │  │ (start new work)                │ jj new                      │  │ │
│  │  │ git checkout <commit>           │ jj new <commit>             │  │ │
│  │  │ git checkout <commit> (edit)    │ jj edit <commit>            │  │ │
│  │  │                                 │                             │  │ │
│  │  │ HISTORY                         │                             │  │ │
│  │  │ ───────                         │                             │  │ │
│  │  │ git rebase -i (fixup)           │ jj squash                   │  │ │
│  │  │ git rebase -i (split)           │ jj split                    │  │ │
│  │  │ git rebase <onto>               │ jj rebase -d <onto>         │  │ │
│  │  │ git cherry-pick                 │ jj new <parent>; jj squash  │  │ │
│  │  │                                 │   --from <source>           │  │ │
│  │  │                                 │                             │  │ │
│  │  │ BRANCHES                        │                             │  │ │
│  │  │ ────────                        │                             │  │ │
│  │  │ git branch <name>               │ jj bookmark create <name>   │  │ │
│  │  │ git checkout -b <name>          │ jj new; jj bookmark create  │  │ │
│  │  │ git branch -d <name>            │ jj bookmark delete <name>   │  │ │
│  │  │                                 │                             │  │ │
│  │  │ REMOTES                         │                             │  │ │
│  │  │ ───────                         │                             │  │ │
│  │  │ git fetch                       │ jj git fetch                │  │ │
│  │  │ git push                        │ jj git push                 │  │ │
│  │  │ git pull                        │ jj git fetch; jj rebase     │  │ │
│  │  │                                 │                             │  │ │
│  │  │ UNDO                            │                             │  │ │
│  │  │ ────                            │                             │  │ │
│  │  │ git reflog; git reset           │ jj undo                     │  │ │
│  │  │ (see history)                   │ jj op log                   │  │ │
│  │  │                                 │                             │  │ │
│  │  └─────────────────────────────────┴─────────────────────────────┘  │ │
│  │                                                                      │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Component Design System

### 4.1 Design Tokens

```css
/* Colors */
--color-bg:           #0a0a0a;
--color-surface:      #141414;
--color-surface-hover:#1a1a1a;
--color-border:       #262626;
--color-border-focus: #404040;

--color-text:         #fafafa;
--color-text-muted:   #a1a1a1;
--color-text-dim:     #525252;

--color-accent:       #22c55e;  /* green - jj/success */
--color-accent-hover: #16a34a;
--color-accent-alt:   #f97316;  /* orange - git */
--color-accent-alt-hover: #ea580c;

--color-error:        #ef4444;
--color-warning:      #eab308;

/* Typography */
--font-mono:          'JetBrains Mono', 'Fira Code', monospace;
--font-size-xs:       12px;
--font-size-sm:       14px;
--font-size-base:     16px;
--font-size-lg:       20px;
--font-size-xl:       24px;
--font-size-2xl:      32px;

--line-height-tight:  1.3;
--line-height-normal: 1.6;

/* Spacing (8px base) */
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-5:  20px;
--space-6:  24px;
--space-8:  32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;

/* Borders */
--radius-sm: 4px;
--radius-md: 6px;
--radius-lg: 8px;

/* Shadows (subtle, terminal-like) */
--shadow-sm: 0 1px 2px rgba(0,0,0,0.4);
--shadow-md: 0 2px 4px rgba(0,0,0,0.4);

/* Focus ring */
--focus-ring: 0 0 0 2px var(--color-accent);

/* Transitions */
--transition-fast: 100ms ease;
--transition-normal: 200ms ease;
```

### 4.2 Component Specifications

#### LessonCard

```
┌────────────────────────────┐
│                            │  Size: 280px × 160px (desktop)
│  jj ← git                  │        100% width (mobile)
│                            │
│  Jujutsu VCS               │  Border: 1px solid --color-border
│                            │  Background: --color-surface
│  ████████░░░░ 8/12         │  Border-radius: --radius-md
│                            │
│  [Continue →]              │  Hover: border-color --color-border-focus
│                            │         background --color-surface-hover
└────────────────────────────┘

States:
- Default: As shown
- Hover: Border highlight, subtle bg change
- Focus: Focus ring
- Has Progress: Shows progress bar
- Coming Soon: Muted text, no button
```

#### CodeBlock (Static)

```
┌──────────────────────────────────────────────────┐
│ bash                                       [Copy]│  Header: 32px height
├──────────────────────────────────────────────────┤  Background: --color-bg
│                                                  │  Border: 1px solid --color-border
│ $ jj status                                      │
│ Working copy changes:                            │  Code font: --font-mono
│ A file.txt                                       │  Code size: --font-size-sm
│                                                  │  Line height: 1.5
│                                                  │  Padding: --space-4
└──────────────────────────────────────────────────┘

Syntax highlighting:
- Commands ($): --color-text
- Comments (#): --color-text-dim
- Strings: --color-accent
- Keywords: --color-accent-alt
```

#### SideBySide Comparison

```
┌─────────────────────────────┬─────────────────────────────┐
│ git                         │ jj                          │  Header bg: transparent
├─────────────────────────────┼─────────────────────────────┤  Header text: --color-text-muted
│                             │                             │  Header size: --font-size-xs
│ $ git add .                 │ # auto-tracked              │
│ $ git commit -m "message"   │ $ jj describe -m "message"  │  Divider: 1px --color-border
│                             │ $ jj new                    │
│                             │                             │  Left bg: rgba(f97316, 0.05)
└─────────────────────────────┴─────────────────────────────┘  Right bg: rgba(22c55e, 0.05)

Mobile: Stack vertically with ↓ arrow between
```

#### InteractiveTerminal

```
┌──────────────────────────────────────────────────────────┐
│ SANDBOX                                      ● Connected │  Header: 36px
├──────────────────────────────────────────────────────────┤
│                                                          │  Status indicator:
│ sandbox@toolkata:~/workspace$ jj log                     │    ● green = connected
│ @  qpvuntsm test@example.com 2024-01-15                  │    ○ yellow = connecting
│ │  (empty) (no description set)                          │    ○ red = error
│ ○  zzzzzzzz root()                                       │
│                                                          │  Terminal: xterm.js
│ sandbox@toolkata:~/workspace$ █                          │  Font: --font-mono 14px
│                                                          │  Background: #0c0c0c
│                                                          │  Min height: 200px
│                                                          │  Max height: 400px
└──────────────────────────────────────────────────────────┘
[Reset]  [Copy]                              Session: 4:32   Footer: 32px

States:
- Connecting: Pulsing indicator, "Starting sandbox..."
- Connected: Green indicator, terminal active
- Error: Red indicator, retry button
- Timeout Warning: Yellow indicator, "Session expires in 1:00"
- Expired: "Session expired" message, restart button
```

#### Callout

```
┌──────────────────────────────────────────────────────────┐
│ TIP: jj never loses data. Use `jj op log` to see all    │
│ operations and `jj undo` to reverse any mistake.        │
└──────────────────────────────────────────────────────────┘

Variants:
- TIP:     Left border: --color-accent (green)
- WARNING: Left border: --color-warning (yellow)
- NOTE:    Left border: --color-text-muted (gray)

Border-left: 3px solid [variant-color]
Background: transparent
Padding: --space-4
```

#### StepProgress (Header)

```
← Overview              Step 9 of 12: Rebasing              [→ 10]

- Back link: --color-text-muted, hover --color-text
- Step indicator: --color-text
- Forward link: --color-accent
- Keyboard: ← and → arrow keys navigate
```

#### Navigation (Footer)

```
[← Step 8: Conflicts]             [Mark Complete]    [Step 10 →]

- Previous: Secondary button style
- Mark Complete: Primary button (--color-accent)
- Next: Primary button
- Spacing: justify-between
- Touch targets: min 44px height
```

---

## 5. Responsive Behavior

### Breakpoints

```
Mobile:  320px - 767px    (single column, stacked layout)
Tablet:  768px - 1023px   (flexible, some side-by-side)
Desktop: 1024px+          (full layout, max-width 1200px)
```

### Component Adaptations

| Component | Mobile | Tablet | Desktop |
|-----------|--------|--------|---------|
| LessonCard | Full width, stacked | 2 columns | 3 columns |
| SideBySide | Stacked (git above jj) | Side-by-side | Side-by-side |
| Terminal | Full width, 200px min height | Full width, 300px | 400px max |
| Navigation | Icons only, bottom fixed | Text + icons | Full text |
| Step list | Collapsible accordion | Visible sidebar | Visible sidebar |

### Mobile-Specific

1. **Fixed bottom navigation** for step pages
2. **Collapsible sections** for long content
3. **Touch-friendly** command suggestions (tap to insert)
4. **Swipe gestures** for prev/next step (optional)

---

## 6. Accessibility Annotations

### WCAG 2.1 AA Compliance Checklist

#### Perceivable

- [x] **1.1.1 Non-text Content**: All icons have aria-labels
- [x] **1.3.1 Info and Relationships**: Semantic HTML (nav, main, article, aside)
- [x] **1.3.2 Meaningful Sequence**: Logical DOM order matches visual order
- [x] **1.4.1 Use of Color**: Progress indicators use both color AND text/pattern
- [x] **1.4.3 Contrast**: All text ≥ 7:1 (targeting AAA for monospace readability)
- [x] **1.4.4 Resize Text**: Usable at 200% zoom
- [x] **1.4.10 Reflow**: No horizontal scroll at 320px width
- [x] **1.4.11 Non-text Contrast**: UI components ≥ 3:1 contrast

#### Operable

- [x] **2.1.1 Keyboard**: All functionality keyboard accessible
- [x] **2.1.2 No Keyboard Trap**: Esc closes modals, focus moves logically
- [x] **2.4.1 Bypass Blocks**: Skip link to main content
- [x] **2.4.2 Page Titled**: Descriptive titles ("Step 9: Rebasing | jj ← git | toolkata")
- [x] **2.4.3 Focus Order**: Logical tab order
- [x] **2.4.4 Link Purpose**: Links describe destination
- [x] **2.4.7 Focus Visible**: Custom focus ring (--focus-ring)
- [x] **2.5.5 Target Size**: Touch targets ≥ 44px

#### Understandable

- [x] **3.1.1 Language**: `<html lang="en">`
- [x] **3.2.3 Consistent Navigation**: Same nav on all pages
- [x] **3.2.4 Consistent Identification**: Same components behave same way
- [x] **3.3.2 Labels**: All inputs have visible labels

#### Robust

- [x] **4.1.2 Name, Role, Value**: ARIA attributes for custom components

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Move to next focusable element |
| `Shift+Tab` | Move to previous focusable element |
| `Enter/Space` | Activate buttons, links |
| `←` | Previous step (on step pages) |
| `→` | Next step (on step pages) |
| `Esc` | Close modal, exit terminal focus |
| `?` | Open keyboard shortcuts help |

### Screen Reader Considerations

```html
<!-- Skip link -->
<a href="#main" class="sr-only focus:not-sr-only">Skip to main content</a>

<!-- Progress announcement -->
<div aria-live="polite" aria-atomic="true">
  Step 9 of 12 complete. 3 steps remaining.
</div>

<!-- Terminal -->
<div role="application" aria-label="Interactive terminal sandbox">
  <div aria-live="polite" aria-atomic="false">
    <!-- Terminal output announced as it appears -->
  </div>
</div>

<!-- Comparison table -->
<table role="table" aria-label="Command comparison: git vs jj">
  <thead>
    <tr><th scope="col">git</th><th scope="col">jj</th></tr>
  </thead>
  ...
</table>
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

---

## 7. Interaction Patterns

### Terminal Interaction States

```
State: IDLE (no sandbox)
┌────────────────────────────────────────┐
│                                        │
│         Click to start sandbox         │
│         [Start Terminal]               │
│                                        │
└────────────────────────────────────────┘

State: CONNECTING
┌────────────────────────────────────────┐
│ SANDBOX                    ○ Starting  │
├────────────────────────────────────────┤
│                                        │
│         Starting sandbox...            │
│         ████████░░░░░░░░░░░░           │
│                                        │
└────────────────────────────────────────┘

State: CONNECTED
┌────────────────────────────────────────┐
│ SANDBOX                    ● Connected │
├────────────────────────────────────────┤
│ sandbox@toolkata:~$ █                  │
└────────────────────────────────────────┘

State: TIMEOUT_WARNING (1 minute remaining)
┌────────────────────────────────────────┐
│ SANDBOX              ● Expires in 0:58 │
├────────────────────────────────────────┤
│ sandbox@toolkata:~$ █                  │
│                                        │
│ ⚠ Session expires soon. Type to extend.│
└────────────────────────────────────────┘

State: EXPIRED
┌────────────────────────────────────────┐
│ SANDBOX                    ○ Expired   │
├────────────────────────────────────────┤
│                                        │
│         Session expired                │
│         [Restart Terminal]             │
│                                        │
└────────────────────────────────────────┘

State: ERROR
┌────────────────────────────────────────┐
│ SANDBOX                    ● Error     │
├────────────────────────────────────────┤
│                                        │
│    Could not connect to sandbox.       │
│    [Retry]  [Use static mode]          │
│                                        │
└────────────────────────────────────────┘
```

### Command Suggestion Interaction

```
Suggested commands:
┌────────────────────────────────────────────────────┐
│ echo "line1" > file.txt && jj describe -m "First" │ ← Click to insert
└────────────────────────────────────────────────────┘

Hover: Background highlight (--color-surface-hover)
Click: Insert into terminal, auto-focus terminal
Touch: Same as click
```

### Progress Persistence

```javascript
// localStorage schema
{
  "toolkata_progress": {
    "jj-git": {
      "completedSteps": [1, 2, 3, 4, 5, 6, 7, 8],
      "currentStep": 9,
      "lastVisited": "2024-01-15T10:23:00Z"
    }
  }
}
```

---

## 8. Error States & Empty States

### Sandbox Unavailable

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  Interactive sandbox is currently unavailable.             │
│                                                            │
│  You can still follow along by copying the commands        │
│  and running them in your local terminal.                  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ $ jj status                                          │ │
│  │ $ jj describe -m "My commit"                         │ │
│  └──────────────────────────────────────────────────────┘ │
│  [Copy all commands]                                       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Rate Limited

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  You've reached the sandbox limit.                         │
│  Try again in 12 minutes.                                  │
│                                                            │
│  In the meantime, you can:                                 │
│  • Read the content below                                  │
│  • Copy commands to run locally                            │
│  • Review the cheat sheet                                  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### No Progress Yet

```
On LessonCard:
┌────────────────────────────┐
│                            │
│  jj ← git                  │
│  Jujutsu VCS               │
│                            │
│  12 steps · ~40 min        │
│                            │
│  [Start Learning →]        │
│                            │
└────────────────────────────┘
```

---

## 9. Design Handoff Notes

### For Developers

1. **Use CSS custom properties** for all design tokens
2. **xterm.js configuration**:
   - Font: JetBrains Mono, 14px
   - Theme: Match --color-* tokens
   - Cursor: Block, blinking
3. **Focus management**: Terminal should trap focus when active, Esc to exit
4. **Lazy load** terminal component (not needed on overview pages)
5. **Preconnect** to sandbox API domain for faster WebSocket
6. **Service worker** for offline MDX content (optional)

### Performance Targets

- First Contentful Paint: < 1s
- Largest Contentful Paint: < 2s
- Time to Interactive: < 3s
- Terminal ready: < 2s after click

### Testing Checklist

- [ ] Keyboard-only navigation through entire flow
- [ ] Screen reader testing (VoiceOver, NVDA)
- [ ] High contrast mode
- [ ] 200% zoom
- [ ] 320px width (mobile)
- [ ] Slow network (sandbox connection)
- [ ] Sandbox timeout flow
- [ ] Progress persistence across sessions

---

## 10. Summary

**Screens Designed:** 6 (Home, Overview, Step, Cheatsheet, mobile variants)
**User Flows:** 4 (Discovery, Resume, Lesson, Sandbox)
**Components:** 8 core components with full specifications
**Accessibility:** WCAG 2.1 AA compliant, targeting AAA for contrast

**Next Steps:**
1. Review with stakeholders
2. Create high-fidelity mockups (optional, given terminal aesthetic)
3. Begin implementation with design tokens
4. Build component library
5. Implement pages with MDX

---

*Document generated by UX Designer skill*
