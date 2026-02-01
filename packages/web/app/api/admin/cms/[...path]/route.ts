/**
 * Proxy API route for CMS admin endpoints.
 *
 * Proxies requests from the browser to the sandbox API's /admin/cms/* endpoints.
 * This allows the browser-based CMS UI to work while maintaining IP-based security
 * (Caddy only allows Vercel server IPs to access /admin/* routes).
 *
 * @example
 * Browser: GET /api/admin/cms/status
 * → Proxy: GET https://sandbox.toolkata.com/admin/cms/status
 */

import { type NextRequest, NextResponse } from "next/server"
import { getSandboxHttpUrl, ADMIN_API_KEY } from "@/lib/sandbox-url"

// Sandbox API base URL
const SANDBOX_URL = getSandboxHttpUrl()

/**
 * Proxy a request to the sandbox API.
 */
async function proxyRequest(
  request: NextRequest,
  path: string[],
  method: string,
): Promise<NextResponse> {
  const targetPath = path.join("/")
  const targetUrl = `${SANDBOX_URL}/admin/cms/${targetPath}`

  // Forward query params
  const url = new URL(request.url)
  const queryString = url.search

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    // Add admin API key
    if (ADMIN_API_KEY) {
      headers["X-Admin-Key"] = ADMIN_API_KEY
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
    }

    // Forward body for POST/PUT/PATCH/DELETE
    if (method !== "GET" && method !== "HEAD") {
      const body = await request.text()
      if (body) {
        fetchOptions.body = body
      }
    }

    const response = await fetch(`${targetUrl}${queryString}`, fetchOptions)

    // Get response body
    const responseText = await response.text()

    // Return proxied response with original status
    return new NextResponse(responseText, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? "application/json",
      },
    })
  } catch (error) {
    console.error(`[CMS Proxy] Error proxying to ${targetUrl}:`, error)
    return NextResponse.json(
      {
        error: "Proxy Error",
        message: error instanceof Error ? error.message : "Failed to reach CMS API",
      },
      { status: 502 },
    )
  }
}

// Route handlers
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  return proxyRequest(request, path, "GET")
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  return proxyRequest(request, path, "POST")
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  return proxyRequest(request, path, "PUT")
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  return proxyRequest(request, path, "DELETE")
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  return proxyRequest(request, path, "PATCH")
}
