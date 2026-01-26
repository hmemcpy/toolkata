import { MDXRemote } from "next-mdx-remote/rsc"
import { notFound } from "next/navigation"
import remarkGfm from "remark-gfm"
import { Footer } from "../../../components/ui/Footer"
import { Header } from "../../../components/ui/Header"
import { ShrinkingLayout } from "../../../components/ui/ShrinkingLayout"
import { StepPageClientWrapper } from "../../../components/ui/StepPageClientWrapper"
import { getPairing, isValidPairingSlug } from "../../../content/pairings"
import { mdxComponents } from "../../../components/mdx/MDXComponents"
import { loadStep } from "../../../services/content"
import { loadToolConfig } from "../../../lib/content-core"
import { resolveSandboxConfig, type RawSandboxConfig } from "../../../lib/content/types"
import type { SandboxConfig } from "../../../components/ui/InteractiveTerminal"

/**
 * Generate static params for all steps of all published tool pairings.
 *
 * This enables Next.js to statically generate step pages at build time
 * for all published tutorial steps.
 */
export function generateStaticParams() {
  const pairings = [
    { slug: "jj-git", steps: 12 },
    { slug: "zio-cats", steps: 15 },
    { slug: "effect-zio", steps: 15 },
  ] as const

  return pairings.flatMap((pairing) =>
    Array.from({ length: pairing.steps }, (_, i) => ({
      toolPair: pairing.slug,
      step: (i + 1).toString(),
    })),
  )
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
    title: `Step ${stepNum} | ${pairing.to.name} ← ${pairing.from.name}`,
    description: `Learn ${pairing.to.name} if you already know ${pairing.from.name}. Step ${stepNum} of ${pairing.steps}.`,
  }
}

/**
 * Step page component.
 *
 * Displays:
 * - StepProgress header (back link, step indicator, next link)
 * - MDX content rendering with custom components (including TryIt for terminal commands)
 * - Navigation footer (Previous/Next step buttons, Mark Complete button)
 *
 * The terminal is available as a collapsible sidebar via TerminalProvider,
 * accessible via the FAB toggle button or TryIt components in MDX content.
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

  // Load MDX content using content-core
  const stepContent = await loadStep(toolPair, stepNum)

  if (!stepContent) {
    notFound()
  }

  const { frontmatter, content } = stepContent

  // Load tool-pair config and resolve sandbox configuration
  // Sandbox config is resolved from: step frontmatter → tool-pair config.yml → global defaults
  const toolConfigResult = await loadToolConfig(toolPair, "content/comparisons").pipe(
    (await import("effect")).Effect.either,
    (await import("effect")).Effect.runPromise,
  )

  const toolConfig =
    toolConfigResult._tag === "Right"
      ? toolConfigResult.right
      : ({
          sandbox: { enabled: true, environment: "bash" as const, timeout: 60, init: [] as const },
        } as const)

  const sandboxConfig: SandboxConfig = resolveSandboxConfig(
    frontmatter.sandbox as RawSandboxConfig | undefined,
    toolConfig,
  )

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Header />

      <ShrinkingLayout>
        <main id="main-content" className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <StepPageClientWrapper
            toolPair={toolPair}
            currentStep={stepNum}
            totalSteps={pairing.steps}
            title={frontmatter.title}
            previousHref={stepNum > 1 ? `/${toolPair}/${stepNum - 1}` : `/${toolPair}`}
            nextHref={stepNum < pairing.steps ? `/${toolPair}/${stepNum + 1}` : null}
            stepCommands={frontmatter.jjCommands ?? []}
            sandboxConfig={sandboxConfig}
          >
            {/* MDX Content */}
            <article className="prose prose-invert max-w-none">
              <MDXRemote
                source={content}
                components={mdxComponents}
                options={{
                  mdxOptions: {
                    remarkPlugins: [remarkGfm],
                  },
                }}
              />
            </article>
          </StepPageClientWrapper>
        </main>

        <Footer />
      </ShrinkingLayout>
    </div>
  )
}
