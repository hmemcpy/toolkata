import { z } from "zod"

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
 * ---
 * ```
 */
export const stepFrontmatterSchema = z.object({
  title: z.string().min(1, "Title is required"),
  step: z.number().int().positive("Step must be a positive integer"),
  description: z.string().min(1, "Description is required").optional(),
  gitCommands: z.array(z.string()).optional(),
  jjCommands: z.array(z.string()).optional(),
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
 * MDX frontmatter schema for cheat sheet pages.
 */
export const cheatsheetFrontmatterSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
})

/**
 * Union type for all supported frontmatter schemas.
 */
export const frontmatterSchema = z.discriminatedUnion("type", [
  stepFrontmatterSchema.extend({ type: z.literal("step") }),
  indexFrontmatterSchema.extend({ type: z.literal("index") }),
  cheatsheetFrontmatterSchema.extend({ type: z.literal("cheatsheet") }),
])

/**
 * Inferred TypeScript types from the schemas.
 */
export type StepFrontmatter = z.infer<typeof stepFrontmatterSchema>
export type IndexFrontmatter = z.infer<typeof indexFrontmatterSchema>
export type CheatsheetFrontmatter = z.infer<typeof cheatsheetFrontmatterSchema>
export type Frontmatter = z.infer<typeof frontmatterSchema>
