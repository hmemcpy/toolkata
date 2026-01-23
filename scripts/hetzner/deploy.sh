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

info() { echo -e "${BLUE}ℹ${NC}  $1"; }
success() { echo -e "${GREEN}✓${NC}  $1"; }
error() { echo -e "${RED}✗${NC}  $1"; exit 1; }

DOMAIN="${SANDBOX_DOMAIN:-sandbox.toolkata.com}"

echo ""
echo "============================================================"
echo "  toolkata Sandbox - Deploy to Hetzner"
echo "============================================================"
echo ""
info "Server: $SERVER_IP"
info "Domain: $DOMAIN"
echo ""

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
info "Installing dependencies and building Docker image..."

ssh "$SSH_USER@$SERVER_IP" 'bash -s' << 'REMOTE'
set -euo pipefail
export PATH="$HOME/.bun/bin:$PATH"

cd /opt/sandbox-api

echo "Installing dependencies..."
bun install --frozen-lockfile

echo "Building Docker image..."
docker build -t toolkata-sandbox:latest -f docker/Dockerfile docker/

echo "Done!"
REMOTE

success "Dependencies installed and Docker image built"

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

# Create and configure log directory
mkdir -p /var/log/sandbox-api
chown sandboxapi:sandboxapi /var/log/sandbox-api
chmod 0755 /var/log/sandbox-api

echo "Log directory configured"
REMOTE

success "User and log directory configured"

# ============================================================
# 4. CONFIGURE CADDY
# ============================================================
info "Configuring Caddy reverse proxy..."

ssh "$SSH_USER@$SERVER_IP" "cat > /etc/caddy/Caddyfile << EOF
$DOMAIN {
    reverse_proxy localhost:3001
}
EOF
systemctl reload caddy"

success "Caddy configured for $DOMAIN"

# ============================================================
# 5. CREATE SYSTEMD SERVICE
# ============================================================
info "Setting up systemd service..."

ssh "$SSH_USER@$SERVER_IP" 'bash -s' << 'REMOTE'
cat > /etc/systemd/system/sandbox-api.service << 'EOF'
[Unit]
Description=toolkata Sandbox API
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
WorkingDirectory=/opt/sandbox-api
ExecStart=/root/.bun/bin/bun run src/index.ts
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3001

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable sandbox-api
systemctl restart sandbox-api
REMOTE

success "Systemd service configured"

# ============================================================
# 6. VERIFY
# ============================================================
info "Verifying deployment..."
sleep 3

if ssh "$SSH_USER@$SERVER_IP" "systemctl is-active sandbox-api" | grep -q "active"; then
  success "sandbox-api is running"
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
