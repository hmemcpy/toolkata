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
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "toolkata - Master tools through practice",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.svg"],
  },
  other: {
    // Preconnect to sandbox API for faster WebSocket connection
    // The environment variable is set in .env.local or at build time
    // Default to localhost for development
    "sandbox-api-preconnect": process.env["NEXT_PUBLIC_SANDBOX_API_URL"] ?? "ws://localhost:3001",
  },
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
  // Get sandbox API URL for preconnect
  const sandboxApiUrl =
    process.env["NEXT_PUBLIC_SANDBOX_API_URL"]?.replace(/^wss?:\/\//, "") ?? "localhost:3001"

  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <head>
        {/* Preconnect to sandbox API for faster WebSocket connections */}
        <link rel="preconnect" href={`http://${sandboxApiUrl}`} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={`http://${sandboxApiUrl}`} />
      </head>
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
