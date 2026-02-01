import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "./lib/auth"

/**
 * Proxy for admin route authentication.
 *
 * Protects all /admin routes except /admin/login and /admin/auth-error.
 * Redirects unauthenticated users to /admin/login.
 */
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Skip auth for public admin routes
  if (pathname === "/admin/login" || pathname === "/admin/auth-error") {
    return NextResponse.next()
  }

  // Check if accessing admin routes
  if (pathname.startsWith("/admin")) {
    // Get session from cookies
    const session = await auth()

    // Redirect to login if not authenticated
    if (!session?.user) {
      const url = request.nextUrl.clone()
      url.pathname = "/admin/login"
      return NextResponse.redirect(url)
    }

    // Redirect to home if authenticated but not admin
    if (!session.user.isAdmin) {
      const url = request.nextUrl.clone()
      url.pathname = "/"
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: "/admin/:path*",
}
