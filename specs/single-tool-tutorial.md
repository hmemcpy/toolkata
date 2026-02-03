# Single-Tool Tutorial Mode

## Overview

Add a "tutorial" mode alongside the existing "pairing" mode so toolkata can teach a single tool from scratch (not as a comparison). First tutorial: **tmux**. Tutorials coexist on the same home page, share the same `[toolPair]` route structure, and use the same sandbox terminal infrastructure.

## Requirements

- **R1**: Introduce a discriminated union type (`mode: "pairing" | "tutorial"`) in `packages/web/content/pairings.ts` so the registry can hold both tool pairings and single-tool tutorials.
- **R2**: `LessonCard` renders single-tool tutorials with just the tool name (no "← from" arrow).
- **R3**: Overview page (`app/[toolPair]/page.tsx`) conditionally renders "Learn {tool}" header, "Why {tool}?" section, and step list for tutorials.
- **R4**: Glossary page branches between two-column comparison (pairings) and single-column cheat sheet (tutorials) via a new `CheatSheetClientWrapper` component.
- **R5**: `CheatSheetEntry` type: `{ id, category, command, description, note? }` — stored in `toolkata-content/tmux/glossary.ts`.
- **R6**: Frontmatter schema gains a generic `commands` field for single-tool tutorials (keeps `gitCommands`/`jjCommands` for backward compat).
- **R7**: New Docker environment `tmux` (`packages/sandbox-api/docker/environments/tmux/`) extends the base image with tmux installed.
- **R8**: Environment registered in `builtin.ts` and `registry.ts`; `SandboxConfig.environment` union expanded.
- **R9**: Content: 8 tmux MDX lessons in `/Users/hmemcpy/git/toolkata-content/tmux/lessons/` plus `config.yml`.
- **R10**: Search data (`lib/search-data.ts`) and `TerminalSearch` handle tutorials (no `fromName`).
- **R11**: `generateStaticParams()` updated in all route files to include tmux.
- **R12**: Glossary data migration: move existing glossary `.ts` files from `packages/web/content/glossary/` to `toolkata-content/` (prerequisite/concurrent task).

## Constraints

- Must not break existing pairings (jj-git, zio-cats, effect-zio).
- Use Bun exclusively (never npm/yarn).
- Follow Biome code style: no semicolons, 2-space indent, double quotes, `@/` path aliases.
- TypeScript strict mode with `exactOptionalPropertyTypes: true`.
- Validation command: `bun run --cwd packages/web build` (includes typecheck).
- tmux Docker image must follow the same security hardening as existing environments (no curl/wget/sudo, non-root user, read-only rootfs).

## Edge Cases

- `isPairing()` / `isTutorial()` type guards must narrow correctly across all components that receive `TutorialEntry`.
- `TerminalSearch` must handle empty `fromName` without rendering "← " prefix.
- `SideBySide` / `ScalaComparisonBlock` / `CrossLanguageBlock` are never used in tutorial MDX but should not error if accidentally imported.
- tmux `Ctrl-b` prefix key must pass through xterm.js without browser interception.
- `stty -echo` in base image `.bashrc` may conflict with tmux's PTY layer — tmux environment should provide its own `.bashrc` without it.
- PID limit of 50 is sufficient for tmux but users creating many panes may hit it.

## Out of Scope

- Mouse support for tmux (xterm.js mouse passthrough).
- Persistent tmux sessions across page reloads (containers are ephemeral).
- Kata/practice exercises for tmux (future work).
- Automated snippet validation for tmux content (future work — needs the Docker image running).
- Glossary migration to content repo is a prerequisite but documented as a separate concern.
