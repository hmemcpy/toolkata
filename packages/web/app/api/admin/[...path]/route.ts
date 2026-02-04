/**
 * Proxy API route for all admin endpoints.
 *
 * Proxies requests from the browser to the sandbox API's /admin/* endpoints.
 * This ensures all requests to the sandbox API originate from Vercel's infrastructure
 * (passes Caddy's IP allowlist) and keeps the ADMIN_API_KEY server-side.
 *
 * Auth: Handled by middleware.ts (matched by /api/admin/:path*).
 *
 * @example
 * Browser: GET /api/admin/rate-limits
 * → Proxy: GET https://sandbox.toolkata.com/admin/rate-limits
 *
 * Browser: POST /api/admin/containers/abc/restart
 * → Proxy: POST https://sandbox.toolkata.com/admin/containers/abc/restart
 *
 * Browser: GET /api/admin/cms/status
 * → Proxy: GET https://sandbox.toolkata.com/admin/cms/status
 */

import { type NextRequest, NextResponse } from "next/server"
import { adminApiFetch } from "@/lib/admin-api"

/**
 * Proxy a request to the sandbox API.
 *
 * Auth is enforced by middleware — by the time this runs,
 * the request is guaranteed to be from an authenticated admin.
 */
async function proxyRequest(
  request: NextRequest,
  path: string[],
  method: string,
): Promise<NextResponse> {
  const targetPath = `/${path.join("/")}`

  // Forward query params
  const url = new URL(request.url)
  const queryString = url.search
  const fullPath = `${targetPath}${queryString}`

  try {
    const headers: Record<string, string> = {}

    // Forward content-type from original request if present
    const contentType = request.headers.get("Content-Type")
    if (contentType) {
      headers["Content-Type"] = contentType
    } else if (method !== "GET" && method !== "HEAD") {
      headers["Content-Type"] = "application/json"
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

    const response = await adminApiFetch(fullPath, fetchOptions)

    // Get response content-type to preserve it
    const responseContentType = response.headers.get("Content-Type") ?? "application/json"

    // Stream SSE responses instead of buffering
    if (responseContentType.includes("text/event-stream") && response.body) {
      return new NextResponse(response.body, {
        status: response.status,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      })
    }

    // Get response body as appropriate type
    const responseBody = await response.arrayBuffer()

    // Return proxied response with original status and content-type
    return new NextResponse(responseBody, {
      status: response.status,
      headers: {
        "Content-Type": responseContentType,
      },
    })
  } catch (error) {
    console.error(`[Admin Proxy] Error proxying ${fullPath}:`, error)
    return NextResponse.json(
      {
        error: "Proxy Error",
        message: error instanceof Error ? error.message : "Failed to reach admin API",
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
