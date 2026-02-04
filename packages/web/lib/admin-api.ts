/**
 * Server-side helper for calling sandbox admin API endpoints.
 *
 * Used by both the API route proxy and server components/actions.
 * Adds the admin API key and constructs the full sandbox URL.
 *
 * This MUST only be used in server-side code (API routes, server components,
 * server actions) — never import this in client components.
 */

import { getSandboxHttpUrl, ADMIN_API_KEY } from "@/lib/sandbox-url"

/**
 * Fetch from the sandbox admin API with proper auth headers.
 *
 * @param path - Admin API path (e.g. "/rate-limits", "/containers/abc/restart")
 * @param init - Optional fetch init (method, body, headers, etc.)
 * @returns The fetch Response object
 */
export async function adminApiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const sandboxUrl = getSandboxHttpUrl()
  const url = `${sandboxUrl}/admin${path}`

  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string>),
  }

  if (ADMIN_API_KEY !== "") {
    headers["X-Admin-Key"] = ADMIN_API_KEY
  }

  console.log(`[adminApiFetch] ${init?.method ?? "GET"} ${url} (key: ${ADMIN_API_KEY ? "set" : "MISSING"})`)

  const response = await fetch(url, {
    ...init,
    headers,
  })

  if (!response.ok) {
    const body = await response.clone().text().catch(() => "")
    console.error(`[adminApiFetch] ${response.status} ${response.statusText} — ${url}`, body.slice(0, 500))
  }

  return response
}
