# toolkata

Interactive tutorials for learning developer tools through hands-on practice.

**Live site:** https://toolkata.vercel.app

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

## License

MIT
