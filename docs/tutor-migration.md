# Tutor Migration Guide

Migration guide for adopting `@hmemcpy/tutor-*` packages.

## Phase 1: Adopt `@hmemcpy/tutor-config`

### 1. Install (in web package)

```bash
cd packages/web
bun add -D @hmemcpy/tutor-config
```

### 2. Update packages/web/tsconfig.json

Replace current config with:

```json
{
  "extends": "@hmemcpy/tutor-config/tsconfig.nextjs.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    },
    "plugins": [{ "name": "next" }]
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

### 3. Update root biome.json

Replace current config with:

```json
{
  "extends": ["@hmemcpy/tutor-config/biome.base.json"],
  "files": {
    "ignore": [".next", "node_modules", "packages/*/dist"]
  }
}
```

### 4. Update sandbox-api tsconfig

For `packages/sandbox-api/tsconfig.json`:

```json
{
  "extends": "@hmemcpy/tutor-config/tsconfig.library.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### 5. Verify

```bash
# Type check both packages
cd packages/web && bun tsc --noEmit
cd ../sandbox-api && bun tsc --noEmit

# Lint check from root
cd ../..
bun biome check .

# Fix auto-fixable issues
bun biome check --write .
```

### 6. Fix Breaking Changes

The stricter config may surface new errors:

- `noUncheckedIndexedAccess`: Array/object access now returns `T | undefined`
- `exactOptionalPropertyTypes`: Optional props can't be `undefined` explicitly
- `noPropertyAccessFromIndexSignature`: Use bracket notation for dynamic keys
- `noNonNullAssertion`: Remove `!` assertions, use proper narrowing

---

## Phase 2: Adopt `@hmemcpy/tutor-content-core`

### 1. Install (in web package)

```bash
cd packages/web
bun add @hmemcpy/tutor-content-core
```

### 2. Define Content Types

Create `packages/web/content/types.ts`:

```typescript
import { defineContentType } from "@hmemcpy/tutor-content-core"
import { z } from "zod"

export const StepType = defineContentType({
  name: "step",
  directory: "content/comparisons",
  schema: z.object({
    title: z.string().min(1),
    step: z.number().int().positive(),
    description: z.string().optional(),
    gitCommands: z.array(z.string()).optional(),
    jjCommands: z.array(z.string()).optional(),
  }),
  // Custom path resolver for nested structure: jj-git/01-step.mdx
  pathResolver: (slug) => {
    const parts = slug.split("/")
    if (parts.length === 2) {
      const [toolPair, stepNum] = parts
      return `${toolPair}/${stepNum.padStart(2, "0")}-step.mdx`
    }
    return `${slug}.mdx`
  },
})

export const IndexType = defineContentType({
  name: "index",
  directory: "content/comparisons",
  schema: z.object({
    title: z.string().min(1),
    description: z.string(),
    estimatedTime: z.string().optional(),
  }),
  pathResolver: (slug) => `${slug}/index.mdx`,
})

export const CheatsheetType = defineContentType({
  name: "cheatsheet",
  directory: "content/comparisons",
  schema: z.object({
    title: z.string().min(1),
    description: z.string(),
  }),
  pathResolver: (slug) => `${slug}/cheatsheet.mdx`,
})
```

### 3. Create Content Service Layer

Create `packages/web/services/content-layer.ts`:

```typescript
import { ContentService, ContentConfig } from "@hmemcpy/tutor-content-core"
import { Layer } from "effect"

const config = ContentConfig.make({
  contentRoot: "./content",
  cache: {
    enabled: false, // Static generation, no runtime cache needed
    strategy: "none",
  },
})

export const ContentLayer = ContentService.Live.pipe(
  Layer.provide(ContentConfig.layer(config))
)
```

### 4. Migrate Existing Code

Replace existing content loading:

```typescript
// Before (existing code in services/content.ts)
export const loadStep = (toolPair: string, step: number) =>
  Effect.gen(function* () {
    // ... existing implementation
  })

// After (new code)
import { ContentService } from "@hmemcpy/tutor-content-core"
import { StepType } from "@/content/types"
import { ContentLayer } from "@/services/content-layer"
import { Effect } from "effect"

export const loadStep = (toolPair: string, step: number) =>
  Effect.gen(function* () {
    const content = yield* ContentService
    return yield* content.load(StepType, `${toolPair}/${step}`)
  }).pipe(Effect.provide(ContentLayer))
```

### 5. Update Page Components

Update `app/[toolPair]/[step]/page.tsx`:

```typescript
import { loadStep } from "@/services/content"
import { Effect } from "effect"

export default async function StepPage({
  params,
}: {
  params: Promise<{ toolPair: string; step: string }>
}) {
  const { toolPair, step } = await params

  const content = await loadStep(toolPair, parseInt(step, 10)).pipe(
    Effect.runPromise
  )

  return (
    <StepPageContent
      frontmatter={content.frontmatter}
      mdxContent={content.content}
    />
  )
}
```

### 6. Update Tests

Update content tests in `packages/web/tests/`:

```typescript
import { ContentService } from "@hmemcpy/tutor-content-core"
import { StepType } from "@/content/types"
import { Effect } from "effect"

test("loads step content", async () => {
  const result = await Effect.gen(function* () {
    const content = yield* ContentService
    return yield* content.load(StepType, "jj-git/1")
  }).pipe(
    Effect.provide(TestContentLayer),
    Effect.runPromise
  )

  expect(result.frontmatter.title).toBeDefined()
  expect(result.frontmatter.step).toBe(1)
})
```

---

## Checklist

### Phase 1
- [ ] Install `@hmemcpy/tutor-config` in packages/web
- [ ] Update `packages/web/tsconfig.json`
- [ ] Update `packages/sandbox-api/tsconfig.json`
- [ ] Update root `biome.json`
- [ ] Run type check on both packages, fix errors
- [ ] Run lint check, fix errors
- [ ] Run tests (`bun test`), ensure passing
- [ ] Commit changes

### Phase 2
- [ ] Install `@hmemcpy/tutor-content-core` in packages/web
- [ ] Define content types in `content/types.ts`
- [ ] Create content service layer
- [ ] Migrate step loading
- [ ] Migrate index loading
- [ ] Migrate cheatsheet loading
- [ ] Update page components
- [ ] Update tests
- [ ] Remove old content service code
- [ ] Run full test suite
- [ ] Commit changes
