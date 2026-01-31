import { MDXRemote } from "next-mdx-remote/rsc"
import { notFound } from "next/navigation"
import remarkGfm from "remark-gfm"
import { KataSession } from "../../../../components/kata/KataSession"
import { getPairing, isValidPairingSlug } from "../../../../content/pairings"
import { mdxComponents } from "../../../../components/mdx/MDXComponents"
import { loadKata } from "../../../../services/content"

/**
 * Generate static params for kata session pages.
 *
 * Only jj-git has Katas initially (7 katas).
 * zio-cats and effect-zio may have Katas in the future.
 */
export async function generateStaticParams() {
  const pairings = [
    { slug: "jj-git", katas: 7 },
    { slug: "zio-cats", katas: 0 },
    { slug: "effect-zio", katas: 0 },
  ] as const

  return pairings.flatMap((pairing) =>
    Array.from({ length: pairing.katas }, (_, i) => ({
      toolPair: pairing.slug,
      kataId: (i + 1).toString(),
    })),
  )
}

/**
 * Generate metadata for the kata session page.
 */
export async function generateMetadata(props: {
  readonly params: Promise<{ readonly toolPair: string; readonly kataId: string }>
}) {
  const params = await props.params
  const pairing = getPairing(params.toolPair)
  const kataNum = Number.parseInt(params.kataId, 10)

  if (!pairing || Number.isNaN(kataNum)) {
    return {}
  }

  // Try to load kata for title
  const kata = await loadKata(params.toolPair, kataNum)
  const title = kata?.frontmatter.title ?? `Kata ${kataNum}`

  return {
    title: `${title} | Kata Practice | ${pairing.to.name} ← ${pairing.from.name}`,
    description: `Practice ${pairing.to.name} with hands-on scenarios. Build muscle memory with auto-validated exercises.`,
  }
}

/**
 * Kata session page.
 *
 * Displays:
 * - Individual Kata practice interface
 * - Header with timer, attempt counter, progress bar
 * - Exercise list with current exercise highlighted
 * - MDX content for current exercise
 * - "Validate My Solution" button
 * - "Reset Sandbox" button
 * - Exit button (returns to landing)
 *
 * Access control:
 * - Client-side component handles unlock redirect via KataProgressContext
 * - Shows 404 for invalid kataId or toolPair
 * - Kata 1 is unlocked after completing Step 12
 * - Kata N+1 is unlocked after completing Kata N
 *
 * @param props - Props containing the dynamic route params.
 */
export default async function KataSessionPage(props: {
  readonly params: Promise<{ readonly toolPair: string; readonly kataId: string }>
}) {
  const params = await props.params
  const { toolPair, kataId: kataIdParam } = params
  const kataNum = Number.parseInt(kataIdParam, 10)

  // Validate the tool pair slug
  if (!isValidPairingSlug(toolPair)) {
    notFound()
  }

  const pairing = getPairing(toolPair)
  if (!pairing) {
    notFound()
  }

  // Validate kata number (1-7 for jj-git, will expand for other pairings)
  if (Number.isNaN(kataNum) || kataNum < 1 || kataNum > 7) {
    notFound()
  }

  // Load kata content using content service
  const kataContent = await loadKata(toolPair, kataNum)

  if (!kataContent) {
    notFound()
  }

  const { frontmatter, content } = kataContent

  return (
    <KataSession
      toolPair={toolPair}
      kataId={kataIdParam}
      frontmatter={frontmatter}
    >
      <MDXRemote
        source={content}
        components={mdxComponents}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkGfm],
          },
        }}
      />
    </KataSession>
  )
}
