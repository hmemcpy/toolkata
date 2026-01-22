"use client"

interface LogoProps {
  readonly size?: "sm" | "md" | "lg" | "xl"
  readonly showWordmark?: boolean
  readonly showTagline?: boolean
  readonly className?: string
}

const sizeMap = {
  sm: {
    character: "text-4xl",
    wordmark: "text-sm",
    tagline: "text-xs",
    gap: "gap-1",
  },
  md: {
    character: "text-6xl",
    wordmark: "text-lg",
    tagline: "text-sm",
    gap: "gap-2",
  },
  lg: {
    character: "text-8xl",
    wordmark: "text-2xl",
    tagline: "text-base",
    gap: "gap-3",
  },
  xl: {
    character: "text-9xl",
    wordmark: "text-4xl",
    tagline: "text-xl",
    gap: "gap-4",
  },
}

export function Logo({
  size = "md",
  showWordmark = true,
  showTagline = false,
  className = "",
}: LogoProps) {
  const styles = sizeMap[size]

  return (
    <div className={`flex flex-col items-center ${styles.gap} ${className}`}>
      {/* Japanese character */}
      <span
        lang="ja"
        className={`${styles.character} font-light text-[var(--color-accent)] leading-none`}
        style={{ fontFamily: "'Noto Sans JP', 'Hiragino Sans', sans-serif" }}
        aria-label="Kata - Japanese character meaning form"
      >
        型
      </span>

      {/* Wordmark */}
      {showWordmark && (
        <span
          className={`${styles.wordmark} font-medium text-zinc-50 tracking-wider`}
        >
          toolkata
        </span>
      )}

      {/* Tagline */}
      {showTagline && (
        <span className={`${styles.tagline} text-zinc-500`}>
          Master developer tools through practice
        </span>
      )}
    </div>
  )
}

/**
 * Inline logo for use in headers/navigation
 */
export function LogoInline({ className = "" }: { readonly className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span
        lang="ja"
        className="text-2xl font-light text-[var(--color-accent)] leading-none"
        style={{ fontFamily: "'Noto Sans JP', 'Hiragino Sans', sans-serif" }}
        aria-label="Kata"
      >
        型
      </span>
      <span className="text-base font-medium text-zinc-50 tracking-wider">
        toolkata
      </span>
    </div>
  )
}
