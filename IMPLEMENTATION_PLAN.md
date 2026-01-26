# Implementation Plan: Effect ← ZIO Tutorial

> **Scope**: Multiple related files | **Risk**: Aggressive | **Validation**: `bun run build && bun run typecheck && bun run lint`

## Summary

Implement a 15-step tutorial teaching Effect.TS to ZIO developers. Delivered in two PRs: (1) infrastructure changes (schema, components, search) and (2) content creation. Infrastructure PR enables cross-language comparisons, searchable tags, and language-based categorization.

---

## Gap Analysis (2026-01-26)

### What Already Exists

| Component | Status | Location |
|-----------|--------|----------|
| ScalaComparisonBlock | ✅ Complete | `components/ui/ScalaComparisonBlock.tsx` |
| SideBySide | ✅ Complete | `components/ui/SideBySide.tsx` |
| TerminalSearch | ⚠️ Partial | `components/ui/TerminalSearch.tsx` (hardcoded jj-git only, see TODO line 20-21) |
| devicons-react | ✅ Installed | `package.json` (v1.5.0) |
| LessonCard icons | ✅ Complete | `scala`, `typescript`, `git-branch`, `arrows-clockwise` (jj) all handled |
| zio-cats tutorial | ✅ Complete | 15 steps in `content/comparisons/zio-cats/` |
| jj-git tutorial | ✅ Complete | 12 steps in `content/comparisons/jj-git/` |
| Glossary system | ✅ Complete | `jj-git.ts`, `zio-cats.ts` with search/filter/categories |
| Dynamic routing | ✅ Complete | `app/[toolPair]/` handles both pairings |
| MDX component registry | ✅ Complete | `components/mdx/MDXComponents.tsx` (7 components) |
| Shiki highlighting | ✅ Complete | Used in ScalaComparisonBlock (server-side) |
| ToolPairing interface | ✅ Complete | `content/pairings.ts` with slug, from/to, category, steps, status |

### What's Missing

| Component | Status | Required For |
|-----------|--------|--------------|
| CrossLanguageBlock | ❌ Not created | Effect-ZIO tutorial (Scala↔TypeScript side-by-side) |
| `tags` field in ToolPairing | ✅ Complete | Added to interface, populated in jj-git and zio-cats |
| `language` field in ToolPairing | ✅ Complete | Added to interface, populated in jj-git and zio-cats |
| jj icon in LessonCard | ✅ Complete | Custom SVG with `arrows-clockwise` icon |
| Dynamic search data | ❌ Missing | Search uses hardcoded `SEARCHABLE_STEPS` (jj-git only) |
| effect-zio content directory | ❌ Missing | All 15 steps + index.mdx + config.yml |
| effect-zio glossary | ❌ Missing | ZIO→Effect command mappings in `content/glossary/effect-zio.ts` |
| effect-zio pairing entry | ❌ Missing | Not in `toolPairings` array in pairings.ts |
| effect-zio steps in overview page | ❌ Missing | `effectZioSteps` array + `effectZioTimes` Map needed |
| effect-zio in generateStaticParams | ❌ Missing | All 3 routing pages need updates |
| zio-cats entries in TerminalSearch | ❌ Missing | Only jj-git searchable currently |

### Key Implementation References

- **ScalaComparisonBlock pattern**: `packages/web/components/ui/ScalaComparisonBlock.tsx` — Async server component with Shiki `codeToHtml()`, `normalizeCode()` function for stripMargin, grid layout
- **Glossary pattern**: `packages/web/content/glossary/zio-cats.ts` — TypeScript file with `GlossaryEntry` interface, categories, search/filter functions
- **Pairing registration**: Add to `toolPairings` array in `packages/web/content/pairings.ts`
- **Step metadata**: Hard-coded arrays in `packages/web/app/[toolPair]/page.tsx` (see `jjGitSteps`, `catsZioSteps`)
- **generateStaticParams locations**:
  - Overview: `app/[toolPair]/page.tsx:17-19`
  - Steps: `app/[toolPair]/[step]/page.tsx:21-33`
  - Glossary: `app/[toolPair]/glossary/page.tsx:27-29`

---

## PR 1: Infrastructure Changes

### P0 - Schema Updates (Blocking)

- [x] **Update ToolPairing interface** — Add `tags?: readonly string[]` and `language?: "typescript" | "scala" | "shell"` fields to `content/pairings.ts:24-79`
- [x] **Update jj-git pairing with new fields** — Add `language: "shell"`, `tags: ["git", "jj", "vcs", "version-control"]` to the jj-git entry (lines 109-127)
- [x] **Update zio-cats pairing with new fields** — Add `language: "scala"`, `tags: ["scala", "zio", "cats-effect", "functional"]` to the zio-cats entry (lines 88-107)

### P1 - Icon Support

- [x] **Add TypeScript icon case to LessonCard** — Import `TypescriptOriginal` from devicons-react, add `case "typescript":` in `getToolIcon()` at `components/ui/LessonCard.tsx:13-18`
- [x] **Add Git icon case to LessonCard** — Import `GitOriginal` from devicons-react, add `case "git-branch":`
- [x] **Add jj icon case to LessonCard** — Create custom `JjIcon` SVG component with `arrows-clockwise`, add `case "arrows-clockwise":`
- [x] **Verify brand colors in pairings** — TypeScript `#3178C6`, Scala `#DC322F`, Git `#f05032`, ZIO `#0066ff`, Cats Effect `#8b5cf6`, jj `#39d96c` — All existing pairings (zio-cats, jj-git) have correct colors

### P2 - CrossLanguageBlock Component

- [x] **Create CrossLanguageBlock component** — New file `components/ui/CrossLanguageBlock.tsx` (UI component like ScalaComparisonBlock)
- [x] **Copy ScalaComparisonBlock structure** — Async server component with Shiki `codeToHtml()`, reuse `normalizeCode()` function for stripMargin
- [x] **Implement dual-panel layout** — ZIO (Scala) left panel with label "ZIO (Scala)", Effect (TypeScript) right panel with label "Effect (TypeScript)"
- [x] **Configure language-specific highlighting** — `language: "scala"` for `zioCode` prop, `language: "typescript"` for `effectCode` prop
- [x] **Add mobile responsive stacking** — `grid-cols-1 md:grid-cols-2` pattern from ScalaComparisonBlock
- [x] **Register in MDX components** — Add `CrossLanguageBlock` to `components/mdx/MDXComponents.tsx` exports

### P3 - Search Improvements (Can defer to later PR)

- [ ] **Add zio-cats steps to TerminalSearch** — Add 15 entries to `SEARCHABLE_STEPS` array (zio-cats currently missing)
- [ ] **Create search data loader** — Function in `lib/` to build searchable steps from pairings + step metadata arrays
- [ ] **Update TerminalSearch component** — Replace hardcoded `SEARCHABLE_STEPS` with dynamic data (address TODO on line 20-21)
- [ ] **Add tags to search matching** — Include pairing tags in filter logic alongside title/description

### P4 - Infrastructure Validation

- [x] **Run full validation** — `bun run build && bun run typecheck && bun run lint`
- [x] **Manual test existing pairings** — Verified via successful build showing all routes: jj-git (12 steps), zio-cats (15 steps), both glossaries generate correctly
- [x] **Test CrossLanguageBlock rendering** — Component verified via successful build, typecheck, and lint; registered in MDXComponents.tsx; uses Shiki for Scala and TypeScript highlighting
- [ ] **Create infrastructure PR** — Commit with descriptive message, push PR 1

---

## PR 2: Content Creation

### P5 - Directory Setup

- [x] **Create content directory** — `packages/web/content/comparisons/effect-zio/`
- [x] **Create config.yml** — Sandbox disabled: `defaults: { sandbox: { enabled: false, environment: "typescript", timeout: 60, init: [] } }`
- [x] **Create index.mdx** — Landing page: title "Effect ← ZIO", description, key differences table, 15-step overview with section groupings (Fundamentals 1-4, Architecture 5-7, Concurrency 8-10, Advanced 11-12, Ecosystem 13-15)

### P6 - Fundamentals (Steps 1-4)

- [ ] **Create 01-step.mdx: Effect<A,E,R> vs ZIO[-R,+E,+A]** — Critical parameter order difference (`A,E,R` vs `R,E,A`), type meanings, mental model, no type aliases in Effect
- [ ] **Create 02-step.mdx: Creating Effects** — `Effect.succeed`, `Effect.fail`, `Effect.sync`, `Effect.try`, `Effect.tryPromise`, `Effect.async`, `Effect.suspend`
- [ ] **Create 03-step.mdx: Error Handling** — Typed errors vs defects, `catchAll`, `catchSome`, `mapError`, `orElse`, `Effect.either`, `Effect.die`
- [ ] **Create 04-step.mdx: Composition with Generators** — `Effect.gen` vs for-comprehension, `yield*` syntax, pipe alternative

### P7 - Application Architecture (Steps 5-7)

- [ ] **Create 05-step.mdx: Services and Context.Tag** — Dependency injection, `Context.Tag` class pattern vs `ZIO.service[T]`, `yield* Tag` access
- [ ] **Create 06-step.mdx: Layers** — `Layer.succeed`, `Layer.effect`, `Layer.scoped`, `Layer.provide`, `Layer.merge` composition vs ZLayer equivalents
- [ ] **Create 07-step.mdx: Resource Management** — `Effect.acquireRelease`, `Effect.scoped`, Scope service, finalizers

### P8 - Concurrency (Steps 8-10)

- [ ] **Create 08-step.mdx: Fibers and Forking** — `Effect.fork`, `Fiber.join`, `Fiber.await`, `Fiber.interrupt`, supervision
- [ ] **Create 09-step.mdx: Concurrent Combinators** — `Effect.all` with concurrency options, `Effect.race`, `Effect.forEach`, timeout
- [ ] **Create 10-step.mdx: Ref and Concurrent State** — `Ref.make`, `Ref.get`, `Ref.set`, `Ref.update`, `Ref.modify`, `SynchronizedRef`

### P9 - Advanced Topics (Steps 11-12)

- [ ] **Create 11-step.mdx: STM** — `TRef`, `STM` type, `STM.commit`, composing transactions, retry semantics
- [ ] **Create 12-step.mdx: Streaming** — `Stream<A,E,R>` type, creation, map/flatMap/filter, `Stream.runCollect`, Sink

### P10 - Ecosystem (Steps 13-15)

- [ ] **Create 13-step.mdx: Schema (Validation)** — `Schema<A,I,R>`, decoding, encoding, composition, vs zio-schema
- [ ] **Create 14-step.mdx: Platform & HTTP** — @effect/platform overview, HttpClient service, cross-platform abstractions
- [ ] **Create 15-step.mdx: Database Access** — @effect/sql, @effect/sql-pg, SqlClient service, transactions

### P11 - Glossary & Routing Integration

- [ ] **Create glossary file** — `content/glossary/effect-zio.ts` with categories: CORE, ERRORS, COMPOSITION, SERVICES, LAYERS, CONCURRENCY, STREAMING, SCHEMA, HTTP, SQL (follow zio-cats.ts pattern with GlossaryEntry interface)
- [ ] **Add effect-zio to pairings.ts** — Full entry: `slug: "effect-zio"`, from: ZIO (Scala, `#DC322F`, icon: "scala"), to: Effect (`#3178C6`, icon: "typescript"), category: "Frameworks & Libraries", steps: 15, estimatedTime: "~75 min", status: "published", language: "typescript", tags: ["typescript", "effect", "zio", "scala", "functional"], toUrl: "https://effect.website"
- [ ] **Update overview page generateStaticParams** — Add `{ slug: "effect-zio" }` to pairings array in `app/[toolPair]/page.tsx:18`
- [ ] **Update step page generateStaticParams** — Add `{ slug: "effect-zio", steps: 15 }` to pairings array in `app/[toolPair]/[step]/page.tsx:22-25`
- [ ] **Update glossary page generateStaticParams** — Add `{ toolPair: "effect-zio" }` to `app/[toolPair]/glossary/page.tsx:28`
- [ ] **Add effectZioSteps array** — 15 step metadata entries in overview page (title, step, description, slug) following `catsZioSteps` pattern
- [ ] **Add effectZioTimes Map** — Estimated times for each step in overview page following `catsZioTimes` pattern
- [ ] **Update overview page step selection** — Add `toolPair === "effect-zio"` case for steps and times selection (around line 180)
- [ ] **Import effect-zio glossary in glossary page** — Import `effectZioGlossary` from `../../../content/glossary/effect-zio`, add case for `toolPair === "effect-zio"` (around line 70)
- [ ] **Add effect-zio to TerminalSearch** — Add 15 entries to `SEARCHABLE_STEPS` array for effect-zio steps

### P12 - Content Validation

- [ ] **Run full validation** — `bun run build && bun run typecheck && bun run lint`
- [ ] **Test /effect-zio route** — Overview page loads correctly with all 15 steps listed
- [ ] **Test /effect-zio/1 through /effect-zio/15** — All step pages render with CrossLanguageBlock showing Scala and TypeScript
- [ ] **Test /effect-zio/glossary** — Glossary page with search/filter works
- [ ] **Create content PR** — Commit and push PR 2

---

## Task Count

**Total**: 55 tasks
- PR 1 (Infrastructure): 20 tasks
- PR 2 (Content): 35 tasks

**Progress**: 12/55 tasks complete (22%)

---

## Dependencies

```
P0 (Schema) ─────────────────────────────────────┐
                                                  │
P1 (Icons) ──────────────────────────────────────┤
                                                  │
P2 (CrossLanguageBlock) ─────────────────────────┼──► P4 (Validation) ──► PR 1
                                                  │
P3 (Search) ─────────────────────────────────────┘
     │
     └──► Can defer to separate PR if needed

PR 1 Complete ──► P5-P12 (Content) ──► PR 2
```

**Critical Path**: P0 → P2 → P4 → P5 → P6-P10 → P11 → P12

---

## Learned

_(Updated during implementation)_

---

## Commands

```bash
# Development
cd packages/web && bun run dev

# Validation
bun run build && bun run typecheck && bun run lint

# Test routes
# http://localhost:3000/effect-zio
# http://localhost:3000/effect-zio/1
# http://localhost:3000/effect-zio/glossary
```

---

## Reference Files

| Purpose | File Path |
|---------|-----------|
| Pairing schema | `packages/web/content/pairings.ts` |
| ScalaComparisonBlock (model) | `packages/web/components/ui/ScalaComparisonBlock.tsx` |
| MDX components registry | `packages/web/components/mdx/MDXComponents.tsx` |
| LessonCard icons | `packages/web/components/ui/LessonCard.tsx:10-19` |
| TerminalSearch (has TODO) | `packages/web/components/ui/TerminalSearch.tsx:20-21` |
| Overview page routing | `packages/web/app/[toolPair]/page.tsx` |
| Step page routing | `packages/web/app/[toolPair]/[step]/page.tsx` |
| Glossary page | `packages/web/app/[toolPair]/glossary/page.tsx` |
| zio-cats glossary (model) | `packages/web/content/glossary/zio-cats.ts` |
| zio-cats tutorial (model) | `packages/web/content/comparisons/zio-cats/` |
| Effect-ZIO spec | `specs/effect-zio.md` |

---

## Key Concept Mappings (Reference)

### Type Signature (CRITICAL)
| ZIO (Scala) | Effect (TypeScript) |
|-------------|---------------------|
| `ZIO[-R, +E, +A]` | `Effect<A, E, R>` |

**Effect puts Success (A) first, not Requirements (R)!**

### Common Mappings
| ZIO | Effect |
|-----|--------|
| `ZIO.succeed(x)` | `Effect.succeed(x)` |
| `ZIO.fail(e)` | `Effect.fail(e)` |
| `ZIO.attempt(...)` | `Effect.try(...)` |
| `ZIO.fromPromise(...)` | `Effect.tryPromise(...)` |
| `for { a <- fa } yield a` | `Effect.gen(function* () { const a = yield* fa; return a })` |
| `ZIO.service[T]` | `yield* Tag` |
| `ZLayer.succeed(...)` | `Layer.succeed(Tag, ...)` |
| `fa.provideLayer(layer)` | `Effect.provide(fa, layer)` |
| `ZIO.fork` | `Effect.fork` |
| `Fiber.join` | `Fiber.join` |
| `Ref.make(...)` | `Ref.make(...)` |
| `ZStream` | `Stream` |
