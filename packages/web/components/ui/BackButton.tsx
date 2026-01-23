"use client"

import { useRouter } from "next/navigation"

export interface BackButtonProps {
  readonly className?: string
  readonly children?: React.ReactNode
}

/**
 * A button that navigates back in browser history.
 */
export function BackButton({ className, children = "← Back" }: BackButtonProps) {
  const router = useRouter()

  return (
    <button type="button" onClick={() => router.back()} className={className}>
      {children}
    </button>
  )
}
