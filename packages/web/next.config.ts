import createMDX from "@next/mdx"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "mdx", "ts", "tsx"],
}

const withMDX = createMDX({
  // Optional: Add custom remark/rehype plugins here
  // mdxOptions: {
  //   remarkPlugins: [],
  //   rehypePlugins: [],
  // },
})

export default withMDX(nextConfig)
