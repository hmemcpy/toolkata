# Build Mode

Implement ONE task from the plan, validate, commit, exit.

## Phase 0: Orient

Study with subagents:
- @AGENTS.md (how to build/test, Effect-TS patterns, TypeScript strictness)
- @specs/* (requirements)
- @IMPLEMENTATION_PLAN.md (current state)
- @PLAN.md (architecture decisions)
- @UX-DESIGN.md (design system, components)

### Check for completion

```bash
grep -c "^\- \[ \]" IMPLEMENTATION_PLAN.md || echo 0
```

- If 0: Run validation → commit → output **RALPH_COMPLETE** → exit
- If > 0: Continue to Phase 1

## Phase 1: Implement

1. **Study the plan** — Choose the most important task from @IMPLEMENTATION_PLAN.md
2. **Search first** — Don't assume not implemented. Verify behavior doesn't already exist
3. **Implement** — ONE task only. Implement completely — no placeholders or stubs
4. **Validate** — Run `bun run typecheck && bun run lint`, must pass before continuing

If stuck, use extended thinking to debug. Add extra logging if needed.

### Key Implementation Guidelines

**TypeScript Strictness:**
```typescript
// Required patterns:
readonly items: readonly Item[]      // Immutable arrays
import type { SomeType } from "./x"  // Type-only imports
interface User { ... }               // Prefer interfaces over type aliases

// Forbidden:
any                                  // Use unknown instead
!                                    // No non-null assertions
```

**Effect-TS Patterns:**
```typescript
// Define errors with Data.TaggedClass
export class SessionError extends Data.TaggedClass("SessionError")<{
  readonly cause: "NotFound" | "Expired" | "RateLimited"
  readonly message: string
}> {}

// Define service interface
export interface SessionServiceShape {
  readonly create: (toolPair: string) => Effect.Effect<Session, SessionError>
}

// Create service tag
export class SessionService extends Context.Tag("SessionService")<
  SessionService,
  SessionServiceShape
>() {}

// Implement with Effect.gen
const make = Effect.gen(function* () {
  const config = yield* ServerConfig
  return { create }
})

// Export Live layer
export const SessionServiceLive = Layer.effect(SessionService, make)
```

**Code Style (Biome):**
- 2-space indentation
- No semicolons (ASI)
- Double quotes for strings
- Trailing commas
- `for...of` loops, not `forEach`

## Phase 2: Update & Learn

**Update IMPLEMENTATION_PLAN.md:**
- Mark task `- [x] Completed`
- Add discovered bugs or issues (even if unrelated to current task)
- Note any new tasks discovered
- Periodically clean out completed items when file gets large

**Update AGENTS.md** (if you learned something new):
- Add correct commands discovered through trial and error
- Keep it brief and operational only — no status updates or progress notes

## Phase 3: Commit & Exit

```bash
git add -A && git commit -m "feat([scope]): [description]"
```

Check remaining:
```bash
grep -c "^\- \[ \]" IMPLEMENTATION_PLAN.md || echo 0
```

- If > 0: Say "X tasks remaining" and EXIT
- If = 0: Output **RALPH_COMPLETE**

## Guardrails

99999. When authoring documentation, capture the why — tests and implementation importance.
999999. Single sources of truth, no migrations/adapters. If tests unrelated to your work fail, resolve them as part of the increment.
9999999. Implement functionality completely. Placeholders and stubs waste time redoing the same work.
99999999. Keep @IMPLEMENTATION_PLAN.md current with learnings — future iterations depend on this to avoid duplicating efforts.
999999999. Keep @AGENTS.md operational only — status updates and progress notes pollute every future loop's context.
9999999999. For any bugs you notice, resolve them or document them in @IMPLEMENTATION_PLAN.md even if unrelated to current work.
99999999999. ONE task per iteration. Search before implementing. Validation MUST pass. Never output RALPH_COMPLETE if tasks remain.
