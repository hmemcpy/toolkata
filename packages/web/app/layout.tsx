import type { Metadata, Viewport } from "next"
import { JetBrains_Mono } from "next/font/google"
import "./globals.css"

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
})

export const metadata: Metadata = {
  title: {
    template: "%s | toolkata",
    default: "toolkata",
  },
  description:
    "Hands-on tutorials for developers switching tools. No fluff. Just the commands you need.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  readonly children: React.ReactNode
}) {
  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <body className="bg-[var(--color-bg)] text-[var(--color-text)] font-mono antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-[var(--color-surface)] focus:px-4 focus:py-2 focus:text-[var(--color-accent)]"
        >
          Skip to main content
        </a>
        <main id="main">{children}</main>
      </body>
    </html>
  )
}
