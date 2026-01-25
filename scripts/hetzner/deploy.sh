#!/bin/bash
# deploy.sh - Deploys sandbox-api to Hetzner Cloud server
#
# Usage:
#   ./scripts/hetzner/deploy.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Load configuration
if [ -f "$SCRIPT_DIR/sandbox.env" ]; then
  source "$SCRIPT_DIR/sandbox.env"
else
  echo "Error: sandbox.env not found. Run setup first."
  exit 1
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

YELLOW='\033[1;33m'

info() { echo -e "${BLUE}ℹ${NC}  $1"; }
success() { echo -e "${GREEN}✓${NC}  $1"; }
warn() { echo -e "${YELLOW}⚠${NC}  $1"; }
error() { echo -e "${RED}✗${NC}  $1"; exit 1; }

DOMAIN="${SANDBOX_DOMAIN:-sandbox.toolkata.com}"
SANDBOX_API_KEY="${SANDBOX_API_KEY:-}"
SANDBOX_ALLOWED_ORIGINS="${SANDBOX_ALLOWED_ORIGINS:-}"

echo ""
echo "============================================================"
echo "  toolkata Sandbox - Deploy to Hetzner"
echo "============================================================"
echo ""
info "Server: $SERVER_IP"
info "Domain: $DOMAIN"
echo ""

# ============================================================
# 0. REQUIRED SECURITY CONFIG
# ============================================================
if [ -z "$SANDBOX_API_KEY" ]; then
  error "SANDBOX_API_KEY is required. Set it in your environment before deploying."
fi

if [ -z "$SANDBOX_ALLOWED_ORIGINS" ]; then
  error "SANDBOX_ALLOWED_ORIGINS is required. Example: https://toolkata.com,https://www.toolkata.com"
fi

# ============================================================
# 1. SYNC CODE
# ============================================================
info "Syncing sandbox-api code..."

rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '*.log' \
  "$PROJECT_ROOT/packages/sandbox-api/" \
  "$SSH_USER@$SERVER_IP:/opt/sandbox-api/"

success "Code synced"

# ============================================================
# 2. BUILD & SETUP ON SERVER
# ============================================================
info "Installing dependencies and building Docker images..."

ssh "$SSH_USER@$SERVER_IP" \
  SANDBOX_API_KEY="$SANDBOX_API_KEY" \
  SANDBOX_ALLOWED_ORIGINS="$SANDBOX_ALLOWED_ORIGINS" \
  'bash -s' << 'REMOTE'
set -euo pipefail
export PATH="/usr/local/bin:$PATH"

cd /opt/sandbox-api

echo "Installing dependencies..."
bun install --frozen-lockfile

echo "Building all Docker images (base + environments)..."
./scripts/docker-build-all.sh

echo "Done!"
REMOTE

success "Dependencies installed and Docker images built"

# ============================================================
# 3. SETUP USER AND LOG DIRECTORY
# ============================================================
info "Setting up sandboxapi user and log directory..."

ssh "$SSH_USER@$SERVER_IP" 'bash -s' << 'REMOTE'
set -euo pipefail

# Create sandboxapi user if it doesn't exist
if ! id "sandboxapi" &>/dev/null; then
    useradd -r -s /bin/false -d /opt/sandbox-api sandboxapi
    echo "Created sandboxapi user"
else
    echo "sandboxapi user already exists"
fi

# Add sandboxapi to docker group for container management
if ! groups sandboxapi | grep -q docker; then
    usermod -aG docker sandboxapi
    echo "Added sandboxapi to docker group"
else
    echo "sandboxapi already in docker group"
fi

# Create and configure log directory
mkdir -p /var/log/sandbox-api
chown sandboxapi:sandboxapi /var/log/sandbox-api
chmod 0755 /var/log/sandbox-api

# Set ownership of application directory
chown -R sandboxapi:sandboxapi /opt/sandbox-api

echo "User and directories configured"
REMOTE

success "User and log directory configured"

# ============================================================
# 4. CONFIGURE CADDY (HARDENED)
# ============================================================
info "Configuring hardened Caddy reverse proxy..."

# Note: Using heredoc without quotes so $DOMAIN expands
ssh "$SSH_USER@$SERVER_IP" bash -c "cat > /etc/caddy/Caddyfile << CADDYEOF
$DOMAIN {
    # Only allow specific API routes - block everything else
    # Limit request body size to reduce DoS risk
    request_body {
        max_size 1MB
    }

    # Health check endpoint
    handle /health {
        reverse_proxy localhost:3001
    }

    # API v1 endpoints (REST + WebSocket)
    handle /api/v1/* {
        reverse_proxy localhost:3001
    }

    # Block all other paths with 404
    handle {
        respond \"Not Found\" 404
    }

    # Security headers
    header {
        # Prevent clickjacking
        X-Frame-Options \"DENY\"
        # Prevent MIME type sniffing
        X-Content-Type-Options \"nosniff\"
        # XSS protection
        X-XSS-Protection \"1; mode=block\"
        # Referrer policy
        Referrer-Policy \"strict-origin-when-cross-origin\"
        # Remove server identification
        -Server
    }
}
CADDYEOF
systemctl reload caddy"

success "Hardened Caddy configured (only /health and /api/v1/* allowed)"

# ============================================================
# 5. INSTALL HARDENED SYSTEMD SERVICE
# ============================================================
info "Installing hardened systemd service..."

# Copy the hardened service file from the repo
scp "$PROJECT_ROOT/packages/sandbox-api/deploy/sandbox-api.service" \
    "$SSH_USER@$SERVER_IP:/etc/systemd/system/sandbox-api.service"

# Create .env file with production settings
ssh "$SSH_USER@$SERVER_IP" \
  SANDBOX_API_KEY="$SANDBOX_API_KEY" \
  SANDBOX_ALLOWED_ORIGINS="$SANDBOX_ALLOWED_ORIGINS" \
  'bash -s' << 'REMOTE'
cat > /opt/sandbox-api/.env << EOF
NODE_ENV=production
PORT=3001
SANDBOX_USE_GVISOR=true
SANDBOX_GVISOR_RUNTIME=runsc
SANDBOX_API_KEY=$SANDBOX_API_KEY
SANDBOX_ALLOWED_ORIGINS=$SANDBOX_ALLOWED_ORIGINS
EOF

# Set correct ownership on .env
chown sandboxapi:sandboxapi /opt/sandbox-api/.env
chmod 0600 /opt/sandbox-api/.env

systemctl daemon-reload
systemctl enable sandbox-api
systemctl restart sandbox-api
REMOTE

success "Hardened systemd service installed (runs as sandboxapi user)"

# ============================================================
# 6. VERIFY
# ============================================================
info "Verifying deployment..."
sleep 3

if ssh "$SSH_USER@$SERVER_IP" "systemctl is-active sandbox-api" | grep -q "active"; then
  success "sandbox-api is running"

  # Verify it's running as sandboxapi user, not root
  RUNNING_USER=$(ssh "$SSH_USER@$SERVER_IP" "ps -o user= -p \$(pgrep -f 'bun.*sandbox-api') 2>/dev/null | head -1" || echo "unknown")
  if [ "$RUNNING_USER" = "sandbox+" ] || [ "$RUNNING_USER" = "sandboxapi" ]; then
    success "Service running as sandboxapi user (not root)"
  else
    warn "Service running as: $RUNNING_USER (expected: sandboxapi)"
  fi
else
  error "sandbox-api failed to start. Check logs: ssh $SSH_USER@$SERVER_IP journalctl -u sandbox-api -n 50"
fi

echo ""
echo "============================================================"
echo -e "${GREEN}  ✓ DEPLOYMENT COMPLETE${NC}"
echo "============================================================"
echo ""
echo "Server: $SERVER_IP"
echo "Domain: $DOMAIN (configure DNS A record)"
echo ""
echo "Commands:"
echo "  ssh $SSH_USER@$SERVER_IP"
echo "  journalctl -u sandbox-api -f    # View logs"
echo "  systemctl restart sandbox-api   # Restart service"
echo ""
echo "DNS Setup:"
echo "  Add A record: $DOMAIN → $SERVER_IP"
echo "============================================================"
