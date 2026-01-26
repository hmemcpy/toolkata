import type { ReactNode } from "react"
import { Providers } from "../../components/Providers"
import { notFound } from "next/navigation"
import { isValidPairingSlug } from "../../content/pairings"

/**
 * Layout for all tool comparison pages.
 *
 * This layout wraps all pages under /[toolPair] with necessary providers:
 * - TerminalProvider: For terminal sidebar state and command execution
 *
 * This includes:
 * - Overview page: /jj-git
 * - Step pages: /jj-git/1, /jj-git/2, etc.
 * - Glossary: /jj-git/glossary
 *
 * Why a layout instead of per-page providers?
 * - Single provider instance for all pages in the toolPair section
 * - Terminal state persists across navigation
 * - Cleaner than wrapping each page individually
 *
 * @param props - Props containing params and children.
 * @param props.params - Route params containing toolPair slug.
 * @param props.children - The page content to render.
 */
export default async function ToolPairLayout(props: {
  readonly params: Promise<{ readonly toolPair: string }>
  readonly children: ReactNode
}) {
  const params = await props.params
  const { toolPair } = params

  // Validate the tool pair slug - return 404 for invalid pairings
  // This prevents creating providers for non-existent routes
  if (!isValidPairingSlug(toolPair)) {
    notFound()
  }

  return <Providers toolPair={toolPair}>{props.children}</Providers>
}
