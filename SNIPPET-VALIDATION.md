# Code Snippet Validation System

## Overview

Build a headless validation system that validates all code snippets in MDX content by executing them against sandbox environments. The system leverages the existing `TryIt` / `SandboxClient` infrastructure, running in "headless" mode (no UI) and reusing sessions per step.

## Key Design Decisions

1. **Reuse existing infrastructure** - Extend `SandboxClient` rather than building new sandbox communication
2. **Session reuse per step** - All snippets in a step share one sandbox session (matches current page behavior)
3. **Headless execution** - No xterm.js, just WebSocket command execution and output collection
4. **Build-time only** - Validation runs locally/CI as a prebuild script, NOT in production
5. **Declarative validation config** - Setup/preconditions declared in MDX at three levels:
   - Pairing-level prelude (default imports/setup for entire pairing)
   - Step-level frontmatter (extend/override for the step)
   - Component-level props (extend/override for specific snippet)
6. **Full compilation/type-check** - Scala and TypeScript snippets are fully compiled, not just syntax-checked

## Production vs Build-time Validation

| Aspect | Production (TryIt on live site) | Build-time Validation |
|--------|--------------------------------|----------------------|
| **When** | User clicks "Run" | During `bun run build` (prebuild step) |
| **Where** | Production sandbox-api | Local sandbox-api (auto-started) |
| **Environment** | Deployed website | Local dev machine or CI runner |
| **Purpose** | Interactive learning | Catch invalid snippets before deploy |
| **Error handling** | Shows error to user (learning moment) | Fails the build (blocks bad code) |
| **Setup commands** | None (user controls state) | Runs prelude/setup first |
| **Session lifecycle** | User-controlled | Script-controlled per step |

**Key point:** Validation ONLY runs during local builds or CI builds. It does NOT run:
- On the production website
- When users interact with TryIt
- At runtime in any way

**TryIt component remains unchanged** - no validation logic added to the React component. The validation system is a completely separate build-time tool that happens to reuse the same sandbox infrastructure.

## Declarative Validation Configuration

### Three-Level Hierarchy

```
Pairing Prelude (config.yml)
    ↓ inherited by all steps
Step Frontmatter (01-step.mdx)
    ↓ can extend/override
Component Props (<TryIt setup={...} />)
    ↓ can extend/override for this snippet
```

### Pairing-Level Prelude

**Location:** `content/comparisons/{pairing}/config.yml`

```yaml
# content/comparisons/zio-cats/config.yml
validation:
  environment: scala
  prelude:
    imports:
      - "import zio._"
      - "import zio.Console._"
      - "import cats.effect._"
      - "import cats.effect.IO"
    wrapper: |
      object Snippet {
        ${code}
      }
```

```yaml
# content/comparisons/jj-git/config.yml
validation:
  environment: bash
  prelude:
    setup:
      - "jj git init ."
      - "git config user.email 'test@test.com'"
      - "git config user.name 'Test User'"
```

```yaml
# content/comparisons/effect-zio/config.yml
validation:
  environment: typescript  # for effectCode
  prelude:
    imports:
      - "import { Effect, Console, pipe } from 'effect'"
  # Also validates zioCode with scala environment
  secondary:
    environment: scala
    prelude:
      imports:
        - "import zio._"
```

### Step-Level Frontmatter

```yaml
---
title: "Advanced Streams"
step: 10
validation:
  # Extend pairing prelude with additional imports
  imports:
    - "import zio.stream._"
    - "import fs2._"
  # Or override setup for shell commands
  setup:
    - "jj git init ."
    - "echo 'content' > file.txt"
    - "jj new"
---
```

### Component-Level Props

```jsx
{/* Override setup for this specific command */}
<TryIt
  command="jj log --revisions main"
  setup={["jj git init .", "jj bookmark create main"]}
/>

{/* Skip validation for pseudo-code */}
<ScalaComparisonBlock
  validate={false}
  zioCode={`val x = ???  // pseudo-code`}
  ...
/>

{/* Add extra imports for this snippet only */}
<ScalaComparisonBlock
  extraImports={["import java.time._"]}
  zioCode={`val now = ZIO.succeed(Instant.now())`}
  ...
/>
```

### Configuration Merging Rules

1. **Imports** - Concatenated (pairing + step + component)
2. **Setup commands** - Component overrides step, step overrides pairing (not merged)
3. **Wrapper** - Component overrides step overrides pairing
4. **validate={false}** - Skips validation entirely for that snippet

## Architecture

```
validate-snippets.ts (CLI entry point)
    ↓
SandboxManager (auto-start sandbox-api if needed)
    ↓
SnippetExtractor (parse MDX, extract code from components)
    ↓
ConfigResolver (merge pairing → step → component config)
    ↓
HeadlessValidator (group by step, execute against sandbox)
    ↓
SandboxClient (existing Effect-TS service - HTTP + WebSocket)
    ↓
sandbox-api (existing - creates containers, manages sessions)
```

### Init/Prelude Command Execution

The sandbox-api needs to support running setup commands without echoing them back. We'll implement and test three approaches to find the best one:

**Approach A: Suppress output for init commands**
- Sandbox-api runs init commands normally via PTY
- Server discards output, only sends `initComplete` signal
- Simplest change, but init errors might be hidden

**Approach B: Separate init phase before PTY attach**
- Run init commands via `docker exec` (non-interactive) BEFORE attaching PTY
- Then attach PTY for interactive session
- Clean separation, init output available for debugging but not sent to WebSocket

**Approach C: Silent flag on init message**
- Add `silent: true` option to existing init message type
- Server buffers output, only sends if `silent: false` or on error
- Most flexible, backward compatible

```typescript
// Enhanced init message
{
  "type": "init",
  "commands": ["jj git init .", "git config user.email 'test@test.com'"],
  "silent": true,      // Don't echo output
  "timeout": 30000
}

// Response
{ "type": "initComplete", "success": true }
// Or on error:
{ "type": "initComplete", "success": false, "error": "command failed", "output": "..." }
```

**Test plan:** Implement all three, run validation with each, compare:
- Does output leak to terminal?
- Are init errors properly reported?
- What's the latency impact?

### Sandbox Auto-Start

The validation script automatically manages the sandbox-api lifecycle:

```typescript
// packages/web/scripts/sandbox-manager.ts

async function ensureSandboxRunning(): Promise<{ cleanup: () => Promise<void> }> {
  const SANDBOX_URL = process.env.SANDBOX_API_URL ?? "http://localhost:3001"

  // 1. Check if already running
  const isRunning = await healthCheck(SANDBOX_URL)
  if (isRunning) {
    console.log("sandbox-api already running")
    return { cleanup: async () => {} }  // no-op cleanup
  }

  // 2. Spawn sandbox-api as child process
  console.log("Starting sandbox-api...")
  const proc = Bun.spawn(["bun", "run", "dev"], {
    cwd: "../sandbox-api",
    stdout: "inherit",
    stderr: "inherit",
  })

  // 3. Wait for health check (with timeout)
  await waitForHealthy(SANDBOX_URL, { timeout: 30000 })
  console.log("sandbox-api ready")

  // 4. Return cleanup function
  return {
    cleanup: async () => {
      console.log("Stopping sandbox-api...")
      proc.kill()
      await proc.exited
    }
  }
}

async function healthCheck(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/api/v1/status`)
    return res.ok
  } catch {
    return false
  }
}
```

**Usage in validate-snippets.ts:**
```typescript
const sandbox = await ensureSandboxRunning()

try {
  // ... run validation ...
} finally {
  await sandbox.cleanup()
}
```

**For CI:** The script handles everything - no manual sandbox-api setup needed.

## Implementation Plan

### Phase 1: Snippet Extraction

**New file:** `packages/web/scripts/snippet-extractor.ts`

Extract snippets from MDX files, handling:
- `ScalaComparisonBlock` → `zioCode`, `catsEffectCode` props
- `CrossLanguageBlock` → `zioCode`, `effectCode` props
- `SideBySide` → `fromCommands`, `toCommands` arrays
- `TryIt` → `command` prop
- Standard markdown code blocks (```language)

Strip the `|` prefix format using existing `normalizeCode` logic from components.

**Output structure:**
```typescript
interface ExtractedSnippet {
  file: string           // e.g., "content/comparisons/jj-git/03-step.mdx"
  toolPair: string       // e.g., "jj-git"
  step: number           // e.g., 3
  lineStart: number
  language: "scala" | "typescript" | "bash"
  source: "ScalaComparisonBlock" | "CrossLanguageBlock" | "SideBySide" | "TryIt" | "codeblock"
  code: string           // normalized code
  prop?: string          // e.g., "zioCode", "fromCommands"
}
```

### Phase 2: Headless Validator Service

**New file:** `packages/web/scripts/headless-validator.ts`

Core validation logic that:
1. Groups snippets by `{toolPair}/{step}`
2. For each step group:
   - Creates ONE sandbox session (reuse pattern)
   - Executes snippets sequentially (preserving state)
   - Collects output for each snippet
   - Detects errors based on tool type
   - Destroys session when step complete
3. Returns validation results

**Session reuse flow:**
```
Step 3 snippets: [init, status, describe, new]
                     ↓
            Create session (jj-git/bash)
                     ↓
            Execute "jj init" → collect output
                     ↓
            Execute "jj status" → collect output (uses repo from init)
                     ↓
            Execute "jj describe -m 'test'" → collect output
                     ↓
            Execute "jj new" → collect output
                     ↓
            Destroy session
```

### Phase 3: Error Detection

Since validation runs at build-time with controlled setup (via prelude/frontmatter), we can be strict about errors.

**Validation flow per snippet:**
1. Run setup commands (from merged config) - these are NOT validated
2. Run the actual snippet command
3. Check for error patterns in output
4. Any error = validation failure (since setup should have prepared correct context)

**Error patterns by tool type:**

| Tool | Validation Failure | Notes |
|------|-------------------|-------|
| jj/git | `error:`, `fatal:`, `usage:`, non-zero exit | With proper setup, these indicate invalid command/flag |
| scala | Compilation fails (non-zero exit from scala-cli) | Full type checking |
| typescript | `error TS`, non-zero exit from tsc | Full type checking with --noEmit |

**Key insight:** Because we control setup via the declarative config, "context errors" (like "not in a repo") should not occur. If they do, it means the setup is incomplete - also a failure worth catching.

**Example validation run:**
```
Step 3, Snippet 1:
  Setup: jj git init . && git config user.email 'test@test.com'
  Command: jj status
  Output: "The working copy is clean"
  Result: PASS

Step 3, Snippet 2:
  Setup: (none - reuses session state from snippet 1)
  Command: jj describe -m "First commit"
  Output: "Working copy now at: ..."
  Result: PASS
```

### Phase 4: New Sandbox Environments

**Scala environment:** `packages/sandbox-api/docker/Dockerfile.scala`
- Base: Eclipse Temurin JDK 21
- Tools: scala-cli, pre-cached ZIO + Cats Effect dependencies
- Validation: `scala-cli compile snippet.scala`

**TypeScript environment:** `packages/sandbox-api/docker/Dockerfile.typescript`
- Base: Node 22 Alpine
- Tools: tsx, typescript, effect package pre-installed
- Validation: `npx tsc --noEmit snippet.ts`

**Register in:** `packages/sandbox-api/src/environments/builtin.ts`

### Phase 5: CLI Entry Point

**New file:** `packages/web/scripts/validate-snippets.ts`

```bash
# Usage
bun run scripts/validate-snippets.ts [options]

Options:
  --strict          Fail on any error (for CI)
  --tool-pair X     Only validate specific tool pair
  --step N          Only validate specific step
  --no-cache        Skip cache, revalidate everything
  --verbose         Show all output, not just errors
```

**Output:**
```
=== Snippet Validation ===

Validating jj-git (12 steps, 67 snippets)...
  Step 1: 5/5 passed
  Step 2: 6/6 passed
  Step 3: 8/8 passed
  ...

Validating zio-cats (15 steps, 156 snippets)...
  Step 1: 12/12 passed
  Step 2: 10/11 passed
    ✗ zio-cats/02-step.mdx:47 (ScalaComparisonBlock.zioCode)
      Error: value serviceWithZIO is not a member of object ZIO

=== Summary ===
Total: 312 snippets
Passed: 311
Failed: 1

Build failed due to snippet validation errors.
```

### Phase 6: Build Integration

**Update:** `packages/web/package.json`
```json
{
  "scripts": {
    "validate:snippets": "bun run scripts/validate-snippets.ts",
    "prebuild": "bun run validate:snippets --strict",
    "build": "next build"
  }
}
```

**GitHub Actions:** `.github/workflows/validate-snippets.yml`
- Runs on PR when content changes
- Caches validation results
- Fails PR if snippets invalid

## Files to Create/Modify

### New Files
- `packages/web/scripts/snippet-extractor.ts` - MDX parsing and snippet extraction
- `packages/web/scripts/headless-validator.ts` - Headless sandbox execution
- `packages/web/scripts/validate-snippets.ts` - CLI entry point
- `packages/web/scripts/config-resolver.ts` - Merge pairing/step/component configs
- `packages/web/scripts/sandbox-manager.ts` - Auto-start/stop sandbox-api
- `packages/sandbox-api/docker/Dockerfile.scala` - Scala sandbox image
- `packages/sandbox-api/docker/Dockerfile.typescript` - TypeScript sandbox image
- `.github/workflows/validate-snippets.yml` - CI workflow

### Modified Files
- `packages/sandbox-api/src/services/websocket.ts` - Add silent init command support
- `packages/sandbox-api/src/routes/websocket.ts` - Handle init message options
- `packages/web/content/comparisons/jj-git/config.yml` - Add validation prelude for shell
- `packages/web/content/comparisons/zio-cats/config.yml` - Add validation prelude for Scala
- `packages/web/content/comparisons/effect-zio/config.yml` - Add validation prelude for Scala/TS
- `packages/sandbox-api/src/environments/builtin.ts` - Add scala/typescript environments
- `packages/sandbox-api/src/environments/registry.ts` - Register new environments
- `packages/web/package.json` - Add validation scripts
- `packages/web/lib/content/schemas.ts` - Add validation schema to frontmatter
- `packages/web/components/ui/ScalaComparisonBlock.tsx` - Add validate/extraImports props
- `packages/web/components/ui/CrossLanguageBlock.tsx` - Add validate/extraImports props
- `packages/web/components/ui/TryIt.tsx` - Add setup prop
- `packages/web/components/ui/SideBySide.tsx` - Add setup prop

## Caching Strategy

Cache at the **step level** since snippets within a step share session state:

```typescript
interface StepCacheEntry {
  stepHash: string         // SHA256 of (config.yml + step frontmatter + all snippets in step)
  toolPair: string
  step: number
  result: "pass" | "fail"
  snippetResults: {
    lineStart: number
    result: "pass" | "fail" | "skipped"
    output: string
  }[]
  timestamp: number
}
```

**Cache key computation:**
```typescript
function computeStepHash(toolPair: string, step: number): string {
  const configYml = readFile(`content/comparisons/${toolPair}/config.yml`)
  const stepMdx = readFile(`content/comparisons/${toolPair}/${step.toString().padStart(2, '0')}-step.mdx`)
  return sha256(configYml + stepMdx)
}
```

**Cache invalidation:** If any of these change, the step is re-validated:
- Pairing's `config.yml`
- Step's MDX file (frontmatter or content)
- Validation script version (via a version constant)

Cache location: `packages/web/.validation-cache/`

## Verification

After implementation, verify by:

1. Run `bun run validate:snippets` - should complete without errors
2. Intentionally break a snippet (typo in command) - should fail validation
3. Run `bun run build` - should run validation as prebuild step
4. Check cache works - second run should be faster (cached results)
5. Test session reuse - step with multiple snippets should show one session created

## Dependencies

- Existing: `SandboxClient`, `sandbox-api`, Docker
- New: None (reuses existing infrastructure)
