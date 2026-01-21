import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "toolkata",
  description: "Learn X if you already know Y",
}

export default function RootLayout({
  children,
}: {
  readonly children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
