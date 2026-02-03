import { z } from "zod"

/**
 * Sandbox configuration schema for step frontmatter.
 *
 * Controls terminal behavior, runtime environment, and initialization.
 *
 * @example
 * ```yaml
 * sandbox:
 *   enabled: true
 *   environment: "node"
 *   timeout: 120
 *   init: ["npm install"]
 * ```
 */
export const sandboxConfigSchema = z
  .object({
    enabled: z.boolean().optional(),
    environment: z.enum(["bash", "node", "python", "scala", "typescript", "tmux"]).optional(),
    timeout: z.number().int().positive().optional(),
    init: z.array(z.string()).optional(),
  })
  .optional()

/**
 * Validation configuration schema for step frontmatter.
 *
 * Used by the snippet validation system to customize validation behavior
 * at the step level. Can extend or override the pairing-level config.
 *
 * @example
 * ```yaml
 * validation:
 *   imports:
 *     - "import zio.stream._"
 *   setup:
 *     - "jj git init ."
 *     - "echo 'content' > file.txt"
 *   wrapper: |
 *     object Snippet { ${code} }
 * ```
 */
export const validationConfigSchema = z
  .object({
    /** Additional import statements to prepend to code snippets (concatenated with pairing config) */
    imports: z.array(z.string()).optional(),
    /** Shell commands to run before validation (overrides pairing config) */
    setup: z.array(z.string()).optional(),
    /** Code wrapper template with ${code} placeholder (overrides pairing config) */
    wrapper: z.string().optional(),
  })
  .optional()

/**
 * MDX frontmatter schema for tutorial steps.
 *
 * Validates the frontmatter of content/*.mdx files to ensure
 * all required fields are present and correctly typed.
 *
 * @example
 * ```yaml
 * ---
 * title: "Your First Commits"
 * step: 3
 * description: "Learn the fundamental difference in how jj handles commits"
 * gitCommands: ["git add", "git commit"]
 * jjCommands: ["jj describe", "jj new"]
 * sandbox:
 *   enabled: true
 *   environment: "node"
 *   init: ["npm install"]
 * ---
 * ```
 */
export const stepFrontmatterSchema = z.object({
  title: z.string().min(1, "Title is required"),
  step: z.number().int().positive("Step must be a positive integer"),
  description: z.string().min(1, "Description is required").optional(),
  gitCommands: z.array(z.string()).optional(),
  jjCommands: z.array(z.string()).optional(),
  zioCommands: z.array(z.string()).optional(),
  commands: z.array(z.string()).optional(),
  sandbox: sandboxConfigSchema,
  validation: validationConfigSchema,
})

/**
 * MDX frontmatter schema for the index/landing page of a tool comparison.
 */
export const indexFrontmatterSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  estimatedTime: z.string().optional(),
})

/**
 * Validation criteria for a Kata exercise.
 *
 * Defines how to validate that a user has completed an exercise correctly.
 * Different validation types provide different ways to check terminal state.
 */
export const exerciseValidationSchema = z.object({
  /** The type of validation to perform */
  type: z.enum(["command", "regex", "exact", "count"]),
  /** Command to execute for validation (e.g., "jj log", "jj status") */
  command: z.string(),
  /** Expected regex pattern (for type: "regex") */
  expectedPattern: z.string().optional(),
  /** Expected exact string (for type: "exact") */
  expectedValue: z.string().optional(),
  /** Minimum count (for type: "count") */
  minCount: z.number().int().positive().optional(),
})

/**
 * Individual exercise within a Kata.
 *
 * Each exercise represents a task the user must complete,
 * with validation criteria to check correctness.
 */
export const exerciseSchema = z.object({
  /** Exercise ID (e.g., "1.1", "2.3") */
  id: z.string().min(1),
  /** Exercise title/description */
  title: z.string().min(1),
  /** Validation criteria for this exercise */
  validation: exerciseValidationSchema,
})

/**
 * MDX frontmatter schema for Kata content files.
 *
 * Defines the structure for Kata practice sessions.
 * Katas are hands-on exercises that build muscle memory
 * after completing the tutorial.
 *
 * @example
 * ```yaml
 * ---
 * title: "The @ Commit Dojo"
 * kata: 2
 * duration: "10 min"
 * focus: "@ commit navigation and auto-rebasing"
 * exercises:
 *   - id: "2.1"
 *     title: "Move @ to parent"
 *     validation:
 *       type: "command"
 *       command: "jj log -r @ --template 'description'"
 *       expectedPattern: "Feature A"
 * ---
 * ```
 */
export const kataFrontmatterSchema = z.object({
  title: z.string().min(1, "Title is required"),
  kata: z.number().int().positive().int().min(1).max(7, "Kata must be between 1 and 7"),
  duration: z.string().min(1, "Duration is required"),
  focus: z.string().min(1, "Focus area is required"),
  exercises: z.array(exerciseSchema).min(1, "At least one exercise is required"),
})

/**
 * Union type for all supported frontmatter schemas.
 */
export const frontmatterSchema = z.discriminatedUnion("type", [
  stepFrontmatterSchema.extend({ type: z.literal("step") }),
  indexFrontmatterSchema.extend({ type: z.literal("index") }),
  kataFrontmatterSchema.extend({ type: z.literal("kata") }),
])

/**
 * Inferred TypeScript types from the schemas.
 */
export type StepFrontmatter = z.infer<typeof stepFrontmatterSchema>
export type IndexFrontmatter = z.infer<typeof indexFrontmatterSchema>
export type KataFrontmatter = z.infer<typeof kataFrontmatterSchema>
export type Frontmatter = z.infer<typeof frontmatterSchema>
export type ValidationConfig = z.infer<typeof validationConfigSchema>
export type Exercise = z.infer<typeof exerciseSchema>
export type ExerciseValidation = z.infer<typeof exerciseValidationSchema>
