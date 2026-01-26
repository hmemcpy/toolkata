# Tutorial Creation Checklist Template

Use this checklist when creating a new "X ← Y" comparison tutorial, where users learn X (target) from their knowledge of Y (source).

---

## Phase 1: Research & Planning

### 1.1 Source Technology (Y) - What Users Already Know

- [ ] **Core concepts inventory**
  - [ ] List fundamental types/abstractions
  - [ ] List common operations/methods
  - [ ] List error handling patterns
  - [ ] List composition patterns

- [ ] **Mental models**
  - [ ] How do users think about this technology?
  - [ ] What metaphors are commonly used?
  - [ ] What are the "aha moments" when learning it?

- [ ] **Common patterns**
  - [ ] Dependency injection approach
  - [ ] Resource management
  - [ ] Concurrency model
  - [ ] Testing patterns

- [ ] **Ecosystem knowledge**
  - [ ] Popular companion libraries
  - [ ] Common integrations (HTTP, DB, etc.)
  - [ ] Build tools and project setup

- [ ] **Pain points users have**
  - [ ] What's difficult or confusing?
  - [ ] Common mistakes
  - [ ] Performance pitfalls

### 1.2 Target Technology (X) - What Users Will Learn

- [ ] **Official documentation review**
  - [ ] Main documentation site URL: _______________
  - [ ] Getting started guide
  - [ ] API reference
  - [ ] Migration guides (if any)

- [ ] **Core concepts inventory**
  - [ ] Fundamental types/abstractions
  - [ ] Naming conventions and terminology
  - [ ] Type signatures and their meanings

- [ ] **Learning resources**
  - [ ] Official tutorials
  - [ ] Video courses
  - [ ] Community resources
  - [ ] Books

- [ ] **Ecosystem overview**
  - [ ] Core library packages
  - [ ] Official companion libraries
  - [ ] Community libraries
  - [ ] Version to target: _______________

- [ ] **Community & support**
  - [ ] Discord/Slack channels
  - [ ] GitHub discussions
  - [ ] Stack Overflow tags

### 1.3 Mapping Analysis

- [ ] **Direct equivalents** (same concept, different syntax)
  | Source (Y) | Target (X) | Notes |
  |------------|------------|-------|
  | | | |

- [ ] **Similar but different** (concept exists but works differently)
  | Source (Y) | Target (X) | Key Difference |
  |------------|------------|----------------|
  | | | |

- [ ] **No equivalent** (concepts unique to target)
  | Target (X) Concept | Purpose | Closest Source Analog |
  |--------------------|---------|----------------------|
  | | | |

- [ ] **Deprecated/discouraged patterns**
  - What patterns from source should NOT be used in target?

- [ ] **Critical differences to highlight early**
  - What will surprise users the most?
  - What mistakes will they make initially?

---

## Phase 2: Content Structure

### 2.1 Tutorial Scope

- [ ] **Estimated total time:** ___ minutes
- [ ] **Number of steps:** ___
- [ ] **Difficulty progression:** Beginner → Intermediate → Advanced

### 2.2 Section Planning

#### Section 1: Fundamentals
_Core type system and basic operations_

| Step | Title | Duration | Key Mapping |
|------|-------|----------|-------------|
| 1 | | ~___ min | |
| 2 | | ~___ min | |
| 3 | | ~___ min | |
| 4 | | ~___ min | |

#### Section 2: Application Architecture
_Dependency injection, resources, structure_

| Step | Title | Duration | Key Mapping |
|------|-------|----------|-------------|
| 5 | | ~___ min | |
| 6 | | ~___ min | |
| 7 | | ~___ min | |

#### Section 3: Concurrency
_Parallel execution, shared state_

| Step | Title | Duration | Key Mapping |
|------|-------|----------|-------------|
| 8 | | ~___ min | |
| 9 | | ~___ min | |
| 10 | | ~___ min | |

#### Section 4: Advanced Topics
_Specialized features_

| Step | Title | Duration | Key Mapping |
|------|-------|----------|-------------|
| 11 | | ~___ min | |
| 12 | | ~___ min | |

#### Section 5: Ecosystem
_Libraries, integrations_

| Step | Title | Duration | Key Mapping |
|------|-------|----------|-------------|
| 13 | | ~___ min | |
| 14 | | ~___ min | |
| 15 | | ~___ min | |

### 2.3 Glossary Planning

- [ ] **Categories identified**
  - [ ] Category 1: _______________
  - [ ] Category 2: _______________
  - [ ] Category 3: _______________
  - [ ] Category 4: _______________

- [ ] **Entry count estimate:** ___ entries

---

## Phase 3: Technical Setup

### 3.1 Code Display

- [ ] **Languages involved**
  - Source language: _______________
  - Target language: _______________
  - Same language? ☐ Yes ☐ No

- [ ] **Comparison component needed**
  - [ ] Same language → Use `ScalaComparisonBlock` or similar
  - [ ] Cross-language → Need `CrossLanguageBlock` (Scala↔TS, etc.)
  - [ ] Existing component works: _______________
  - [ ] New component needed: _______________

- [ ] **Syntax highlighting**
  - [ ] Source language highlighting verified (Shiki)
  - [ ] Target language highlighting verified (Shiki)
  - [ ] Both languages in same codeblock if needed

### 3.2 Interactive Features

- [ ] **Code playgrounds** (choose one)
  - [ ] Static code only
  - [ ] Embedded playground: _______________
  - [ ] External links to playground

- [ ] **Sandbox environment** (choose one)
  - [ ] Not applicable (reading-only tutorial)
  - [ ] Terminal sandbox needed
  - [ ] Browser-based sandbox needed

### 3.3 File Structure

```
packages/web/content/comparisons/{slug}/
├── index.mdx              # Landing page
├── config.yml             # Sandbox configuration
├── 01-step.mdx            # Step 1
├── ...
└── {N}-step.mdx           # Step N

packages/web/content/glossary/{slug}.ts  # Glossary data
```

---

## Phase 4: Implementation Checklist

### 4.1 Infrastructure

- [ ] Create content directory: `content/comparisons/{slug}/`
- [ ] Create `config.yml` with sandbox settings
- [ ] Create glossary file: `content/glossary/{slug}.ts`
- [ ] Add pairing to `content/pairings.ts`
- [ ] Update `generateStaticParams` in `app/[toolPair]/page.tsx`
- [ ] Update `generateStaticParams` in `app/[toolPair]/[step]/page.tsx`
- [ ] Add steps array to overview page
- [ ] Add estimated times map to overview page

### 4.2 Content Creation

- [ ] Write `index.mdx` landing page
  - [ ] "Why learn X?" section
  - [ ] Key differences callout
  - [ ] Section overview with step list
  - [ ] Prerequisites

- [ ] Write each step MDX file
  - [ ] Step 1: _______________
  - [ ] Step 2: _______________
  - [ ] Step 3: _______________
  - [ ] Step 4: _______________
  - [ ] Step 5: _______________
  - [ ] Step 6: _______________
  - [ ] Step 7: _______________
  - [ ] Step 8: _______________
  - [ ] Step 9: _______________
  - [ ] Step 10: _______________
  - [ ] Step 11: _______________
  - [ ] Step 12: _______________
  - [ ] Step 13: _______________
  - [ ] Step 14: _______________
  - [ ] Step 15: _______________

- [ ] Write glossary entries
  - [ ] All categories populated
  - [ ] Descriptions are concise
  - [ ] Source equivalents noted

### 4.3 Quality Assurance

- [ ] **Code verification**
  - [ ] All source code examples compile/run
  - [ ] All target code examples compile/run
  - [ ] Code follows style conventions

- [ ] **Content review**
  - [ ] Technical accuracy verified
  - [ ] No celebration language ("Congratulations!", etc.)
  - [ ] Direct, concise writing style
  - [ ] Navigation links work (Next/Previous)

- [ ] **Route testing**
  - [ ] Overview page loads: `/{slug}`
  - [ ] All step pages load: `/{slug}/1` through `/{slug}/N`
  - [ ] Glossary page loads: `/{slug}/glossary`

- [ ] **Responsive testing**
  - [ ] Mobile layout (320px)
  - [ ] Tablet layout (768px)
  - [ ] Desktop layout (1024px+)

---

## Phase 5: Documentation

### 5.1 Plan Document

- [ ] Create `PLAN-{slug}.md` with:
  - [ ] Overview and goals
  - [ ] Complete mapping tables
  - [ ] Tutorial structure
  - [ ] Implementation order
  - [ ] Resources and references

### 5.2 Updates to Project Docs

- [ ] Update `CLAUDE.md` if new patterns established
- [ ] Update `README.md` with new tutorial listing
- [ ] Commit with clear message

---

## Branding & Categorization

### Language/Ecosystem Assignment

- [ ] **Identify primary language** of target technology
  - TypeScript, Scala, Rust, Go, Shell, etc.

- [ ] **Determine category placement**
  - Category icon represents the **target** ("to") technology
  - e.g., effect-zio → TypeScript category (learning Effect.TS)

- [ ] **Define searchable tags**
  - Include: target name, source name, language(s), paradigm
  - Example: `["typescript", "effect", "zio", "scala", "functional"]`

- [ ] **Select brand colors**
  - Use official brand colors where possible
  - TypeScript: `#3178C6`, Scala: `#DC322F`, Rust: `#DEA584`

### Icon Requirements

- [ ] **Target technology icon** available in devicons-react?
  - If not, find SVG or create custom icon
- [ ] **Add to `getToolIcon()` function** in LessonCard.tsx

---

## Reference: Information Sources to Gather

### For Source Technology (Y)

| Information Type | Where to Find |
|------------------|---------------|
| Core concepts | Official docs, "Getting Started" |
| API reference | API docs, source code |
| Mental models | Blog posts, conference talks |
| Common patterns | Style guides, best practices docs |
| Pain points | GitHub issues, Stack Overflow, Reddit |
| Ecosystem | Awesome lists, package registries |

### For Target Technology (X)

| Information Type | Where to Find |
|------------------|---------------|
| Official docs | Main website |
| Getting started | Tutorial/intro sections |
| API reference | API docs, TypeDoc/ScalaDoc |
| Migration guides | Docs, blog posts |
| Learning resources | YouTube, courses, books |
| Community | Discord, GitHub Discussions |
| Ecosystem | Package registry, GitHub org |
| Version info | Release notes, changelog |

### Comparison Resources

| Resource Type | Purpose |
|---------------|---------|
| "X vs Y" blog posts | Community perspective on differences |
| Migration guides | Official stance on equivalents |
| Author talks/interviews | Design philosophy insights |
| GitHub issues/discussions | Edge cases and gotchas |

---

## Template Usage

1. **Copy this file** to `PLAN-{slug}.md`
2. **Fill in the checklists** as you research
3. **Use the mapping tables** to document equivalents
4. **Track implementation** with the checkboxes
5. **Reference this template** for future tutorials

---

## Example: effect-zio

See `PLAN-effect-zio.md` for a completed example of this template applied to the Effect ← ZIO tutorial.
