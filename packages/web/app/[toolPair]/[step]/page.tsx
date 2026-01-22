import { Header } from "../../../components/ui/Header"
import { Footer } from "../../../components/ui/Footer"
import { StepProgressWrapper } from "../../../components/ui/StepProgressWrapper"
import { NavigationWrapper } from "../../../components/ui/NavigationWrapper"
import { MDXRemote } from "next-mdx-remote/rsc"
import { Callout } from "../../../components/ui/Callout"
import { CodeBlock } from "../../../components/ui/CodeBlock"
import { SideBySide } from "../../../components/ui/SideBySide"
import { getPairing, isValidPairingSlug } from "../../../content/pairings"
import { notFound } from "next/navigation"
import fs from "node:fs/promises"
import path from "node:path"
import matter from "gray-matter"

/**
 * Generate static params for all steps of all published tool pairings.
 *
 * This enables Next.js to statically generate step pages at build time
 * for all published tutorial steps.
 */
export function generateStaticParams() {
  const pairings = [{ slug: "jj-git" }]
  const steps = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

  return pairings.flatMap((pairing) =>
    steps.map((step) => ({
      toolPair: pairing.slug,
      step: step.toString(),
    })),
  )
}

/**
 * Get the MDX filename for a step number.
 */
function getStepFilename(step: number): string {
  return `${step.toString().padStart(2, "0")}-step.mdx`
}

/**
 * Get the content directory path for a tool pairing.
 */
function getContentPath(toolPair: string): string {
  const isDev = process.env.NODE_ENV === "development"
  if (isDev) {
    return path.join(process.cwd(), "content", "comparisons", toolPair)
  }
  return path.join(process.cwd(), "content", "comparisons", toolPair)
}

/**
 * Load MDX content for a specific step.
 */
async function loadStepContent(toolPair: string, step: number) {
  const basePath = getContentPath(toolPair)
  const filename = getStepFilename(step)
  const filePath = path.join(basePath, filename)

  try {
    await fs.access(filePath)
  } catch {
    return null
  }

  const fileContent = await fs.readFile(filePath, "utf-8")
  const { data: frontmatter, content } = matter(fileContent)

  return {
    frontmatter: frontmatter as {
      title: string
      step: number
      description?: string
      gitCommands?: string[]
      jjCommands?: string[]
    },
    content,
  }
}

/**
 * Generate metadata for the step page.
 */
export async function generateMetadata(props: {
  readonly params: Promise<{ readonly toolPair: string; readonly step: string }>
}) {
  const params = await props.params
  const pairing = getPairing(params.toolPair)
  const stepNum = Number.parseInt(params.step, 10)

  if (!pairing) {
    return {}
  }

  return {
    title: `Step ${stepNum}: ${pairing.to.name} Tutorial | ${pairing.to.name} ← ${pairing.from.name} | toolkata`,
    description: `Learn ${pairing.to.name} if you already know ${pairing.from.name}. Step ${stepNum} of ${pairing.steps}.`,
  }
}

/**
 * Custom MDX components for rendering.
 */
const mdxComponents = {
  Callout,
  CodeBlock,
  SideBySide,
}

/**
 * Step page component.
 *
 * Displays:
 * - StepProgress header (back link, step indicator, next link)
 * - MDX content rendering with custom components
 * - CommandSuggestions section (shows commands from frontmatter)
 * - Navigation footer (Previous/Next step buttons, Mark Complete button)
 * - Placeholder for terminal (Phase 8): "Interactive sandbox coming soon"
 */
export default async function StepPage(
  props: { readonly params: Promise<{ readonly toolPair: string; readonly step: string }> },
) {
  const params = await props.params
  const { toolPair, step: stepParam } = params
  const stepNum = Number.parseInt(stepParam, 10)

  // Validate the tool pair slug
  if (!isValidPairingSlug(toolPair)) {
    notFound()
  }

  const pairing = getPairing(toolPair)
  if (!pairing) {
    notFound()
  }

  // Validate step number
  if (Number.isNaN(stepNum) || stepNum < 1 || stepNum > pairing.steps) {
    notFound()
  }

  // Load MDX content
  const stepContent = await loadStepContent(toolPair, stepNum)

  if (!stepContent) {
    notFound()
  }

  const { frontmatter, content } = stepContent
  const hasGitCommands = frontmatter.gitCommands && frontmatter.gitCommands.length > 0
  const hasJjCommands = frontmatter.jjCommands && frontmatter.jjCommands.length > 0
  const allCommands = [...(frontmatter.gitCommands ?? []), ...(frontmatter.jjCommands ?? [])]
  const showCommandSuggestions = hasGitCommands || hasJjCommands

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Header />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Step Progress Header */}
        <StepProgressWrapper
          toolPair={toolPair}
          currentStep={stepNum}
          totalSteps={pairing.steps}
          title={frontmatter.title}
          nextHref={stepNum < pairing.steps ? `/${toolPair}/${stepNum + 1}` : null}
        />

        {/* MDX Content */}
        <article className="my-8 prose prose-invert max-w-none">
          <MDXRemote source={content} components={mdxComponents} />
        </article>

        {/* Interactive Terminal Placeholder */}
        <section className="my-12 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
          <h2 className="mb-4 text-xl font-mono font-medium text-[var(--color-text)]">
            Try It Yourself
          </h2>
          <p className="mb-6 text-sm text-[var(--color-text-muted)]">
            Interactive sandbox coming soon. Practice these commands in a safe, isolated environment.
          </p>
          <div
            className="rounded border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] p-6 font-mono text-sm text-[var(--color-text-dim)]"
          >
            <span className="text-[var(--color-text-muted)]">$</span> Terminal sandbox will appear here
          </div>
        </section>

        {/* Command Suggestions - Static Display */}
        {showCommandSuggestions && (
          <section className="my-8">
            <h3 className="mb-4 text-sm font-mono font-medium text-[var(--color-text-muted)]">
              Suggested Commands
            </h3>
            <div className="flex flex-col gap-2">
              {allCommands.map((command, index) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: Commands are static and order won't change
                  key={index}
                  className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 font-mono text-sm text-[var(--color-text)]"
                >
                  <code>{command}</code>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Navigation Footer */}
        <NavigationWrapper
          toolPair={toolPair}
          currentStep={stepNum}
          totalSteps={pairing.steps}
          previousTitle={stepNum > 1 ? `Step ${stepNum - 1}` : null}
          nextTitle={stepNum < pairing.steps ? `Step ${stepNum + 1}` : null}
        />
      </main>

      <Footer />
    </div>
  )
}
