/**
 * On-demand revalidation endpoint for GitHub webhooks.
 *
 * When content is pushed to toolkata-content repo, GitHub sends a webhook
 * to this endpoint, which invalidates the cached pages for affected content.
 *
 * Setup:
 * 1. Set REVALIDATION_SECRET env var in Vercel
 * 2. Add webhook in GitHub repo settings:
 *    - URL: https://toolkata.com/api/revalidate
 *    - Content type: application/json
 *    - Secret: same as REVALIDATION_SECRET
 *    - Events: Just the push event
 */

import { revalidatePath } from "next/cache"
import { type NextRequest, NextResponse } from "next/server"
import crypto from "node:crypto"

/**
 * Verify GitHub webhook signature.
 */
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac("sha256", secret)
  const digest = `sha256=${hmac.update(payload).digest("hex")}`
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))
}

/**
 * Extract affected tool pairs from changed files.
 *
 * @example
 * "jj-git/lessons/01-step.mdx" → "jj-git"
 * "zio-cats/config.yml" → "zio-cats"
 */
function extractToolPairs(files: string[]): Set<string> {
  const toolPairs = new Set<string>()

  for (const file of files) {
    // First path segment is the tool pair
    const match = file.match(/^([^/]+)\//)
    if (match?.[1]) {
      toolPairs.add(match[1])
    }
  }

  return toolPairs
}

/**
 * Get all changed files from a GitHub push payload.
 */
function getChangedFiles(payload: GitHubPushPayload): string[] {
  const files: string[] = []

  for (const commit of payload.commits) {
    files.push(...commit.added, ...commit.modified, ...commit.removed)
  }

  return [...new Set(files)] // dedupe
}

interface GitHubCommit {
  added: string[]
  modified: string[]
  removed: string[]
}

interface GitHubPushPayload {
  ref: string
  commits: GitHubCommit[]
  repository: {
    name: string
    full_name: string
  }
}

export async function POST(request: NextRequest) {
  const secret = process.env["REVALIDATION_SECRET"]

  if (!secret) {
    console.error("REVALIDATION_SECRET not configured")
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
  }

  // Verify GitHub signature
  const signature = request.headers.get("x-hub-signature-256")
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 })
  }

  const payload = await request.text()

  if (!verifySignature(payload, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  // Parse payload
  let data: GitHubPushPayload
  try {
    data = JSON.parse(payload)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // Only process pushes to main branch
  if (data.ref !== "refs/heads/main") {
    return NextResponse.json({ message: "Ignored non-main branch" }, { status: 200 })
  }

  // Extract changed files and affected tool pairs
  const changedFiles = getChangedFiles(data)
  const toolPairs = extractToolPairs(changedFiles)

  if (toolPairs.size === 0) {
    return NextResponse.json({ message: "No content files changed" }, { status: 200 })
  }

  // Revalidate affected paths
  const revalidated: string[] = []

  for (const toolPair of toolPairs) {
    // Revalidate overview page
    revalidatePath(`/${toolPair}`)
    revalidated.push(`/${toolPair}`)

    // Revalidate all step pages (we don't know which specific steps changed)
    // Next.js will only regenerate pages that are actually stale
    for (let step = 1; step <= 15; step++) {
      revalidatePath(`/${toolPair}/${step}`)
      revalidated.push(`/${toolPair}/${step}`)
    }

    // Revalidate kata pages
    revalidatePath(`/${toolPair}/kata`)
    revalidated.push(`/${toolPair}/kata`)
    for (let kata = 1; kata <= 10; kata++) {
      revalidatePath(`/${toolPair}/kata/${kata}`)
      revalidated.push(`/${toolPair}/kata/${kata}`)
    }

    // Revalidate glossary and cheatsheet
    revalidatePath(`/${toolPair}/glossary`)
    revalidatePath(`/${toolPair}/cheatsheet`)
    revalidated.push(`/${toolPair}/glossary`, `/${toolPair}/cheatsheet`)
  }

  // Also revalidate home page (shows all pairings)
  revalidatePath("/")
  revalidated.push("/")

  console.log(`Revalidated ${revalidated.length} paths for tool pairs: ${[...toolPairs].join(", ")}`)

  return NextResponse.json({
    revalidated: revalidated.length,
    toolPairs: [...toolPairs],
    message: "Revalidation complete",
  })
}

/**
 * Health check for the revalidation endpoint.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    configured: !!process.env["REVALIDATION_SECRET"],
  })
}
