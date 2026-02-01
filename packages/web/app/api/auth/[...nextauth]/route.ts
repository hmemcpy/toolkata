/**
 * NextAuth API route handler.
 *
 * Mounts the Auth.js handlers at /api/auth/* for:
 * - /api/auth/signin - Sign in page
 * - /api/auth/signout - Sign out
 * - /api/auth/callback - OAuth callbacks
 * - /api/auth/session - Get current session
 * - /api/auth/csrf - CSRF token
 * - /api/auth/providers - List providers
 */
import { handlers } from "../../../../lib/auth"

export const { GET, POST } = handlers
