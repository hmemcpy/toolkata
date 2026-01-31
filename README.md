# toolkata

Interactive tutorials for learning developer tools through hands-on practice.

**Live site:** https://toolkata.com

## Available Tutorials

### jj (Jujutsu) for Git Users

Learn [jj](https://github.com/martinvonz/jj), a modern version control system, by comparing it side-by-side with git commands you already know. The tutorial includes:

- 12 progressive steps from basics to advanced workflows
- Interactive terminal sandbox for hands-on practice
- Command cheat sheet for quick reference

## Project Structure

```
toolkata/
├── packages/
│   ├── web/           # Next.js frontend (deployed to Vercel)
│   └── sandbox-api/   # Docker sandbox API (self-hosted)
└── ...
```

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS, MDX
- **Backend:** Effect-TS, Bun
- **Sandbox:** Docker containers with jj/git pre-installed

## Development

```bash
# Install dependencies
bun install

# Run frontend dev server
bun run --cwd packages/web dev

# Run sandbox API (requires Docker)
bun run --cwd packages/sandbox-api dev
```

## Admin Dashboard

The admin dashboard provides management interfaces for rate limits, containers, and system metrics.

### Environment Variables

**Frontend (Vercel):**
- `NEXT_PUBLIC_ADMIN_API_KEY` — Admin API key for calling sandbox admin endpoints
- `NEXT_PUBLIC_SANDBOX_URL` — Sandbox API URL (e.g., `https://sandbox.toolkata.com`)
- `AUTH_GOOGLE_ID` — Google OAuth client ID for NextAuth authentication
- `AUTH_GOOGLE_SECRET` — Google OAuth client secret
- `AUTH_SECRET` — NextAuth secret for JWT signing (generate with `openssl rand -base64 32`)
- `ADMIN_EMAILS` — Comma-separated list of authorized admin emails

**Sandbox API (VPS):**
- `ADMIN_API_KEY` — Admin API key (must match `NEXT_PUBLIC_ADMIN_API_KEY` from frontend)
- `NODE_ENV` — Set to `production` for production builds (enforces security checks)

### Accessing the Admin Dashboard

1. Set up Google OAuth in [Google Cloud Console](https://console.cloud.google.com):
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI: `https://toolkata.com/api/auth/callback/google`
2. Configure environment variables in Vercel dashboard
3. Navigate to `/admin` and sign in with Google
4. Access is restricted to emails listed in `ADMIN_EMAILS`

### Security

- Admin API endpoints require `X-Admin-Key` header matching `ADMIN_API_KEY`
- Admin UI requires authenticated Google account in `ADMIN_EMAILS` allowlist
- Production deployments fail fast if `ADMIN_API_KEY` is not set

## License

MIT
