import createMDX from "@next/mdx"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "mdx", "ts", "tsx"],
  env: {
    NEXT_PUBLIC_GIT_SHA: process.env["VERCEL_GIT_COMMIT_SHA"] ?? "dev",
  },
  // Disable Turbopack MDX compiler to allow rehype plugins
  experimental: {
    mdxRs: false,
  },
}

const withMDX = createMDX({
  options: {
    remarkPlugins: [["remark-gfm", {}]],
    rehypePlugins: [
      [
        "@shikijs/rehype",
        {
          themes: {
            light: "github-light",
            dark: "github-dark",
          },
          defaultColor: false,
        },
      ],
    ],
  },
})

export default withMDX(nextConfig)
