# Hetzner Cloud Sandbox Deployment

Scripts for deploying the toolkata sandbox API to Hetzner Cloud.

## Server Details

| Property | Value |
|----------|-------|
| Hostname | crab-people (Tailscale) |
| Type | CAX11 (4GB RAM, 2 vCPU ARM64) |
| Location | Nuremberg, Germany (nbg1) |
| OS | Ubuntu 24.04 |
| Cost | ~€3.79/mo |

## Installed Software

- Docker 29.1.5
- gVisor (runsc) 20260112.0
- Bun 1.3.6
- Caddy 2.10.2

## Quick Start

```bash
# Required environment variables for secure deployment
export SANDBOX_API_KEY="your-strong-random-key"
export SANDBOX_ALLOWED_ORIGINS="https://toolkata.com,https://www.toolkata.com"

# Optional: GitHub CMS configuration (enables content editing in admin dashboard)
export GITHUB_TOKEN="ghp_xxxxx"
export GITHUB_OWNER="toolkata"
export GITHUB_REPO="content"

# Deploy sandbox-api
./scripts/hetzner/deploy.sh

# SSH into server
ssh root@crab-people

# View logs
ssh root@crab-people journalctl -u sandbox-api -f
```

## DNS Setup

Add an A record pointing your domain to the server's public IP:

```
sandbox.toolkata.com  A  46.224.239.222
```

Note: Use the public IP (not the Tailscale hostname). Deploy access uses Tailscale, but public traffic goes through the public IP.

Caddy will automatically provision SSL via Let's Encrypt.

## Managing the Server

### hcloud CLI

```bash
# List servers
hcloud server list

# Power off
hcloud server poweroff crab-people

# Power on
hcloud server poweron crab-people

```

### SSH Commands

```bash
# Service management
systemctl status sandbox-api
systemctl restart sandbox-api
journalctl -u sandbox-api -f

# Docker
docker ps
docker logs <container-id>

# Caddy
systemctl status caddy
journalctl -u caddy -f
```

## Security

### Service Hardening

The sandbox-api service runs with defense-in-depth:
- **Dedicated user** - Runs as `sandboxapi` user (not root)
- **Docker group** - Only permission needed for container management
- **systemd hardening** - NoNewPrivileges, ProtectSystem, PrivateTmp, etc.
- **Resource limits** - 512MB RAM, 1 CPU core max

### Caddy Reverse Proxy

Caddy is configured with a strict route allowlist:
- `/health` - Health check endpoint
- `/api/v1/*` - API endpoints only
- All other paths return 404

Security headers applied:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- Server header removed

### Container Isolation

Each sandbox container runs with:
- **gVisor (runsc)** - Kernel-level syscall filtering
- **No network** - `NetworkMode: none`
- **Read-only root** - tmpfs for workspace
- **Resource limits** - 128MB RAM, 0.5 CPU, 50 PIDs
- **Dropped capabilities** - All Linux capabilities removed

## Note

This server (`crab-people`) is shared between multiple apps. Do not delete it.
