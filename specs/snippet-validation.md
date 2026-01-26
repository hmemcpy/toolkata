# Snippet Validation System Specification

## Overview

Build-time validation system that executes code snippets from MDX content against sandbox environments to ensure all tutorial examples compile and run correctly.

## Requirements

- **R1**: Extract code snippets from MDX files (ScalaComparisonBlock, CrossLanguageBlock, SideBySide, TryIt, code blocks)
- **R2**: Support declarative validation config at three levels: pairing prelude (config.yml), step frontmatter, component props
- **R3**: Auto-start sandbox-api when running validation (health check, spawn if needed, cleanup on exit)
- **R4**: Reuse sandbox session per step (all snippets in a step share one session)
- **R5**: Support silent init commands (setup/prelude runs without echoing to output)
- **R6**: Detect validation errors by tool type (shell: error/fatal/usage patterns, scala/typescript: compilation failures)
- **R7**: Cache validation results at step level (hash of config.yml + step MDX)
- **R8**: Fail build on validation errors (prebuild script integration)
- **R9**: Support `validate={false}` prop to skip specific snippets
- **R10**: Create Scala and TypeScript sandbox environments for compilation validation

## Constraints

- Must use existing SandboxClient Effect-TS service (no new sandbox communication code)
- Must work with existing sandbox-api architecture (via HTTP + WebSocket)
- Validation runs only at build-time (local/CI), never in production
- TryIt component in production remains unchanged
- Use Bun for all scripts and tooling
- Follow Effect-TS patterns for new services

## Edge Cases

- **Empty snippets**: Skip validation, don't fail
- **Snippets with `...` or `???`**: Auto-detect pseudo-code, skip or require explicit `validate={false}`
- **Setup command failures**: Report clearly which setup command failed
- **Sandbox-api not starting**: Timeout after 30s with clear error message
- **Session timeout during validation**: Retry once, then fail with context
- **Partial snippets needing imports**: Use prelude from config hierarchy to wrap

## Out of Scope

- Runtime validation in production
- Modifying TryIt component behavior
- Visual regression testing of output
- Performance benchmarking of snippets
- Cross-step state validation (each step is independent)
