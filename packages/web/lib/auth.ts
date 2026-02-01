/**
 * NextAuth.js (Auth.js v5) configuration for toolkata admin dashboard.
 *
 * Provides Google OAuth authentication with admin email allowlist.
 * Only users with emails in ADMIN_EMAILS can access /admin routes.
 */

import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"

/**
 * Parse ADMIN_EMAILS from environment variable.
 * Comma-separated list of email addresses allowed to access admin dashboard.
 *
 * Example: admin@example.com,user@example.com
 */
function parseAdminEmails(): readonly string[] {
  const envVar = process.env["ADMIN_EMAILS"]
  if (!envVar) {
    return []
  }
  return envVar
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0)
}

/**
 * Check if an email address is in the admin allowlist.
 */
export function isAdminEmail(email: string): boolean {
  const adminEmails = parseAdminEmails()
  if (adminEmails.length === 0) {
    // If no admin emails configured, no one is admin (fail closed)
    return false
  }
  return adminEmails.includes(email.toLowerCase())
}

/**
 * NextAuth configuration with Google OAuth provider.
 */
export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env["AUTH_GOOGLE_ID"] ?? process.env["GOOGLE_CLIENT_ID"] ?? "",
      clientSecret:
        process.env["AUTH_GOOGLE_SECRET"] ?? process.env["GOOGLE_CLIENT_SECRET"] ?? "",
    }),
  ],

  /**
   * Callback invoked when a user signs in.
   * Restricts sign-in to admin email allowlist only.
   */
  callbacks: {
    signIn({ user, account }) {
      // Only allow Google OAuth sign-ins
      if (account?.provider !== "google") {
        return false
      }

      // Only allow verified emails
      if (!user.email) {
        return false
      }

      // Only allow admin emails
      return isAdminEmail(user.email)
    },

    /**
     * Callback invoked when creating/updating the session.
     * Adds isAdmin flag to session for server-side checks.
     */
    session({ session, token }) {
      if (session.user && token.email) {
        session.user.isAdmin = isAdminEmail(token.email)
      }
      return session
    },

    /**
     * Callback invoked when JWT is created.
     * Persists email and isAdmin flag in JWT for session continuity.
     */
    async jwt({ token, user }) {
      if (user) {
        // First call, user is available. Persist email and isAdmin in token.
        token.email = user.email
        token.isAdmin = isAdminEmail(user.email ?? "")
      }
      return token
    },
  },

  // Use JWT strategy (default for Next.js 16)
  session: {
    strategy: "jwt",
  },

  // Custom pages
  pages: {
    signIn: "/admin/login",
    error: "/admin/auth-error",
  },

  // Debug in development
  debug: process.env.NODE_ENV === "development",
}

/**
 * NextAuth export for App Router.
 */
export const { auth, handlers, signIn, signOut } = NextAuth(authConfig)

/**
 * Extend the built-in session types to include isAdmin.
 */
declare module "next-auth" {
  interface Session {
    user: {
      email: string
      name?: string | null
      image?: string | null
      isAdmin: boolean
    }
  }

  interface User {
    isAdmin?: boolean
  }
}

// Note: JWT augmentation in next-auth v5 uses @auth/core/jwt
// We're assigning isAdmin without explicit augmentation as the token accepts arbitrary properties

