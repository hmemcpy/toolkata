/**
 * Content service layer configuration.
 *
 * Provides the Effect layer for ContentService.
 * Used by page components to load MDX content.
 */

import {
  CacheServiceLive,
  ContentConfigLive,
  ContentServiceLive,
  githubSource,
  localSource,
} from "../content-core"
import { Layer } from "effect"

/**
 * Determine content source based on environment.
 *
 * - Production: Fetch from GitHub (toolkata-content repo)
 * - Development: Use local files (if CONTENT_SOURCE=local or not set)
 *
 * Set CONTENT_SOURCE=github to test GitHub fetching locally.
 *
 * Environment variables:
 * - CONTENT_SOURCE: "github" | "local" (default: local in dev, github in prod)
 * - GITHUB_OWNER: GitHub owner (default: "hmemcpy")
 * - GITHUB_REPO: GitHub repo (default: "toolkata-content")
 * - GITHUB_BRANCH: Git branch (default: "main")
 * - GITHUB_TOKEN: PAT for private repos or higher rate limits (optional)
 */
const getContentSource = () => {
  const useGitHub =
    process.env["CONTENT_SOURCE"] === "github" ||
    (process.env["NODE_ENV"] === "production" && process.env["CONTENT_SOURCE"] !== "local")

  if (useGitHub) {
    const token = process.env["GITHUB_TOKEN"]
    return githubSource({
      owner: process.env["GITHUB_OWNER"] ?? "hmemcpy",
      repo: process.env["GITHUB_REPO"] ?? "toolkata-content",
      branch: process.env["GITHUB_BRANCH"] ?? "main",
      ...(token ? { token } : {}),
    })
  }

  return localSource(process.cwd())
}

/**
 * Content layer for production use.
 *
 * Configuration:
 * - Production: Fetch from GitHub (toolkata-content repo)
 * - Development: Use local files
 * - Caching: Disabled for local (Next.js handles GitHub fetch cache)
 */
export const ContentLayer = ContentServiceLive.pipe(
  Layer.provide(
    Layer.mergeAll(
      ContentConfigLive({
        contentRoot: process.cwd(),
        source: getContentSource(),
        cacheEnabled: false,
      }),
      CacheServiceLive,
    ),
  ),
)
