import fs from "node:fs/promises"
import path from "node:path"
import matter from "gray-matter"
import { MDXRemote } from "next-mdx-remote/rsc"
import { notFound } from "next/navigation"
import { Callout } from "../../../components/ui/Callout"
import { CodeBlock } from "../../../components/ui/CodeBlock"
import { Footer } from "../../../components/ui/Footer"
import { Header } from "../../../components/ui/Header"
import { SideBySide } from "../../../components/ui/SideBySide"
import { StepPageClientWrapper } from "../../../components/ui/StepPageClientWrapper"
import { getPairing, isValidPairingSlug } from "../../../content/pairings"

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
 * - Interactive terminal with CommandSuggestions (wired together)
 * - Navigation footer (Previous/Next step buttons, Mark Complete button)
 */
export default async function StepPage(props: {
  readonly params: Promise<{ readonly toolPair: string; readonly step: string }>
}) {
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
  // Ensure arrays, handling both undefined and non-array values
  const gitCmds = Array.isArray(frontmatter.gitCommands) ? frontmatter.gitCommands : []
  const jjCmds = Array.isArray(frontmatter.jjCommands) ? frontmatter.jjCommands : []
  const allCommands = [...gitCmds, ...jjCmds]

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Header />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <StepPageClientWrapper
          toolPair={toolPair}
          currentStep={stepNum}
          totalSteps={pairing.steps}
          title={frontmatter.title}
          previousHref={stepNum > 1 ? `/${toolPair}/${stepNum - 1}` : `/${toolPair}`}
          nextHref={stepNum < pairing.steps ? `/${toolPair}/${stepNum + 1}` : null}
          suggestedCommands={allCommands}
        >
          {/* MDX Content */}
          <article className="prose prose-invert max-w-none">
            <MDXRemote source={content} components={mdxComponents} />
          </article>
        </StepPageClientWrapper>
      </main>

      <Footer />
    </div>
  )
}
