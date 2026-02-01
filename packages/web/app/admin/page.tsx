import { redirect } from "next/navigation"

/**
 * Admin root page - redirects to the first dashboard page.
 *
 * Authentication is handled by proxy.ts - only authenticated admin users
 * can reach this page.
 */
export default function AdminPage() {
  // Redirect to rate limits as the default dashboard page
  redirect("/admin/rate-limits")
}
