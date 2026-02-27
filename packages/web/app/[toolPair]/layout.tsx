import type { ReactNode } from "react"
import { Providers } from "../../components/Providers"
import { notFound } from "next/navigation"
import { isValidEntrySlug } from "../../content/pairings"

/**
 * Layout for all tool comparison pages.
 *
 * Wraps all pages under /[toolPair] with:
 * - KataProgressProvider: For exercise progress tracking
 */
export default async function ToolPairLayout(props: {
  readonly params: Promise<{ readonly toolPair: string }>
  readonly children: ReactNode
}) {
  const params = await props.params
  const { toolPair } = params

  if (!isValidEntrySlug(toolPair)) {
    notFound()
  }

  return (
    <Providers>
      {props.children}
    </Providers>
  )
}
