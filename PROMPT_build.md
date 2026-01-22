# Build Mode

Implement ONE task from the plan, validate, commit, exit.

## Code Style Guidelines

### Non-Negotiable Rules

**TypeScript:**
- **No `any`** — Use `unknown` and narrow with type guards
- **No non-null assertions (`!`)** — Use proper null checks or `Option` from Effect
- **No type assertions (`as`)** — Prefer type guards and refinements
- **Handle all index access** — Arrays and objects return `T | undefined`
- **Explicit return types** — All exported functions must have explicit return types
- **Readonly by default** — Use `readonly` for all properties and parameters

**Effect-TS:**
```typescript
// Service pattern
export class MyService extends Context.Tag("MyService")<
  MyService,
  { readonly doSomething: (input: string) => Effect.Effect<Output, MyError> }
>() {}

// Error pattern
export class MyError extends Data.TaggedClass("MyError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

// Option import (MUST use module import)
import * as Option from "effect/Option"  // ✅ Correct
import { Option } from "effect"          // ❌ Wrong
```

**Biome:**
- No `forEach` — Use `for...of` loops
- Use `import type` for type-only imports
- Use optional chaining (`?.`) instead of manual checks

---

## Phase 0: Orient

Study with subagents:
- @CLAUDE.md (project-specific context and coding standards)
- @specs/* (requirements)
- @IMPLEMENTATION_PLAN.md (current state)

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
4. **Validate** — Run `bun run typecheck && bun run lint && bun run build`, must pass before continuing

If stuck, use extended thinking to debug. Add extra logging if needed.

## Phase 2: Update & Learn

**Update IMPLEMENTATION_PLAN.md:**
- Mark task `- [x] Completed`
- Add discovered bugs or issues (even if unrelated to current task)
- Note any new tasks discovered
- Periodically clean out completed items when file gets large

**Update CLAUDE.md** (if you learned something new):
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

99999. **STRICTLY FOLLOW code style guidelines** — This is non-negotiable.
999999. When authoring documentation, capture the why — tests and implementation importance.
9999999. Single sources of truth, no migrations/adapters. If tests unrelated to your work fail, resolve them as part of the increment.
99999999. Implement functionality completely. Placeholders and stubs waste time redoing the same work.
999999999. Keep @IMPLEMENTATION_PLAN.md current with learnings — future iterations depend on this to avoid duplicating efforts.
9999999999. Keep @CLAUDE.md operational only — status updates and progress notes pollute every future loop's context.
99999999999. For any bugs you notice, resolve them or document them in @IMPLEMENTATION_PLAN.md even if unrelated to current work.
999999999999. ONE task per iteration. Search before implementing. Validation MUST pass. Never output RALPH_COMPLETE if tasks remain.
