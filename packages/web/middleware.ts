/**
 * Next.js middleware for admin route protection.
 *
 * Requires authenticated admin session for:
 * - /admin/* pages (except /admin/login and /admin/auth-error)
 * - /api/admin/* API routes
 *
 * Unauthenticated users are redirected to /admin/login.
 * Authenticated non-admin users see the auth-error page.
 */

import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl

  // Skip auth for login and error pages
  if (pathname === "/admin/login" || pathname === "/admin/auth-error") {
    return NextResponse.next()
  }

  // Check if user is authenticated
  if (!req.auth) {
    // API routes get 401, pages get redirected
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Admin session required" },
        { status: 401 },
      )
    }
    const loginUrl = new URL("/admin/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Check if user is admin
  const isAdmin = (req.auth as { user?: { isAdmin?: boolean } }).user?.isAdmin
  if (!isAdmin) {
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json(
        { error: "Forbidden", message: "Admin access required" },
        { status: 403 },
      )
    }
    return NextResponse.redirect(new URL("/admin/auth-error", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
}
