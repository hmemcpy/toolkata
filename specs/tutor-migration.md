# Tutor Migration Specification

## Overview

Complete the migration to `@hmemcpy/tutor-*` packages for shared TypeScript/Biome configuration and content loading infrastructure.

## Requirements

### R1: sandbox-api TypeScript Configuration
- Update `packages/sandbox-api/tsconfig.json` to extend `@hmemcpy/tutor-config/tsconfig.library.json`
- Maintain existing `outDir` and `rootDir` settings
- Fix any type errors surfaced by stricter config

### R2: Content Loading Tests
- Add unit tests for content loading via tutor-content-core
- Test step loading with valid/invalid slugs
- Test index loading
- Test cheatsheet loading
- Verify frontmatter validation works

### R3: Cleanup Legacy Code
- Remove any duplicate content loading logic
- Ensure single source of truth for content types

## Constraints

- Must pass `bun run typecheck` in both packages
- Must pass `bun run lint` at root
- Must pass `bun run build` for web package
- Existing Playwright tests must continue to pass

## Edge Cases

### E1: sandbox-api exactOptionalPropertyTypes
- Effect-TS context inference may conflict with strictest TypeScript settings
- Document any necessary type workarounds

### E2: Content Not Found
- ContentService should return typed `ContentError` with `cause: "NotFound"`
- Tests should verify error handling

## Out of Scope

- Migrating sandbox-api services to use tutor packages (no content loading there)
- Adding new content types beyond Step, Index, Cheatsheet
