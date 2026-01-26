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
    environment: z.enum(["bash", "node", "python"]).optional(),
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
 * Union type for all supported frontmatter schemas.
 */
export const frontmatterSchema = z.discriminatedUnion("type", [
  stepFrontmatterSchema.extend({ type: z.literal("step") }),
  indexFrontmatterSchema.extend({ type: z.literal("index") }),
])

/**
 * Inferred TypeScript types from the schemas.
 */
export type StepFrontmatter = z.infer<typeof stepFrontmatterSchema>
export type IndexFrontmatter = z.infer<typeof indexFrontmatterSchema>
export type Frontmatter = z.infer<typeof frontmatterSchema>
export type ValidationConfig = z.infer<typeof validationConfigSchema>
