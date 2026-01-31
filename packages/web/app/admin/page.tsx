import { redirect } from "next/navigation"

/**
 * Admin dashboard home page.
 *
 * Redirects to rate limits page as the primary admin view.
 * A proper dashboard can be built later with summary metrics.
 */
export default function AdminPage() {
  redirect("/admin/rate-limits")
}
