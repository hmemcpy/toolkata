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
# 4. CONFIGURE CADDY (HARDENED) WITH ADMIN ROUTES
# ============================================================
info "Configuring hardened Caddy reverse proxy (with admin routes)..."

# Generate admin API key if not provided
if [ -z "${ADMIN_API_KEY:-}" ]; then
    # Check if already exists on server
    EXISTING_KEY=$(ssh "$SSH_USER@$SERVER_IP" "cat /etc/caddy/admin.env 2>/dev/null | grep ADMIN_API_KEY | cut -d= -f2" || echo "")
    if [ -n "$EXISTING_KEY" ]; then
        ADMIN_API_KEY="$EXISTING_KEY"
        info "Using existing ADMIN_API_KEY from server"
    else
        ADMIN_API_KEY=$(openssl rand -hex 32)
        warn "ADMIN_API_KEY not set, generated: $ADMIN_API_KEY"
        warn "Save this key for Vercel environment variable!"
    fi
fi

# Get Vercel egress IPs for admin route protection
VERCEL_IPS=$(curl -s https://api.vercel.com/v1/ips 2>/dev/null | jq -r '.blocks[]' 2>/dev/null || echo -e "76.76.21.0/24\n76.76.22.0/24")

# Build Caddyfile locally for comparison
CADDY_TEMP=$(mktemp)
cat > "$CADDY_TEMP" << CADDYHEADER
$DOMAIN {
    request_body {
        max_size 1MB
    }

    handle /health {
        reverse_proxy localhost:3001
    }

    handle /api/v1/* {
        reverse_proxy localhost:3001
    }

    handle /admin/* {
CADDYHEADER

# Add Vercel IPs
while IFS= read -r ip; do
    echo "        remote_ip $ip" >> "$CADDY_TEMP"
done <<< "$VERCEL_IPS"

cat >> "$CADDY_TEMP" << 'CADDYFOOTER'

        @invalid_key {
            not header X-Admin-Key {$ADMIN_API_KEY}
        }
        respond @invalid_key "Unauthorized" 403

        reverse_proxy localhost:3001
    }

    handle {
        respond "Not Found" 404
    }

    header {
        X-Frame-Options "DENY"
        X-Content-Type-Options "nosniff"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
        -Server
    }
}
CADDYFOOTER

# Check if config changed
EXISTING_CADDY=$(ssh "$SSH_USER@$SERVER_IP" "cat /etc/caddy/Caddyfile 2>/dev/null || echo ''")
if [ "$EXISTING_CADDY" != "$(cat "$CADDY_TEMP")" ]; then
    info "Caddy config changed, updating..."
    scp "$CADDY_TEMP" "$SSH_USER@$SERVER_IP:/etc/caddy/Caddyfile"
    systemctl reload caddy
    success "Caddy reloaded with new config"
else
    success "Caddy config unchanged, skipping reload"
fi
rm -f "$CADDY_TEMP"

# Store admin API key for Caddy (idempotent)
ssh "$SSH_USER@$SERVER_IP" "echo 'ADMIN_API_KEY=$ADMIN_API_KEY' > /etc/caddy/admin.env && chmod 640 /etc/caddy/admin.env && chown root:caddy /etc/caddy/admin.env"

success "Hardened Caddy configured"

# ============================================================
# 5. INSTALL HARDENED SYSTEMD SERVICE
# ============================================================
info "Installing hardened systemd service..."

# Copy the hardened service file from the repo (with checksum comparison)
SERVICE_LOCAL="$PROJECT_ROOT/packages/sandbox-api/deploy/sandbox-api.service"
SERVICE_REMOTE_HASH=$(ssh "$SSH_USER@$SERVER_IP" "md5sum /etc/systemd/system/sandbox-api.service 2>/dev/null | cut -d' ' -f1" || echo "none")
SERVICE_LOCAL_HASH=$(md5sum "$SERVICE_LOCAL" | cut -d' ' -f1)

SERVICE_CHANGED=false
if [ "$SERVICE_REMOTE_HASH" != "$SERVICE_LOCAL_HASH" ]; then
    info "Service file changed, updating..."
    scp "$SERVICE_LOCAL" "$SSH_USER@$SERVER_IP:/etc/systemd/system/sandbox-api.service"
    SERVICE_CHANGED=true
else
    success "Service file unchanged"
fi

# Build new .env content locally for comparison
ENV_TEMP=$(mktemp)
cat > "$ENV_TEMP" << EOF
NODE_ENV=production
PORT=3001
SANDBOX_USE_GVISOR=true
SANDBOX_GVISOR_RUNTIME=runsc
SANDBOX_API_KEY=$SANDBOX_API_KEY
SANDBOX_ALLOWED_ORIGINS=$SANDBOX_ALLOWED_ORIGINS
ADMIN_API_KEY=$ADMIN_API_KEY
REDIS_URL=redis://localhost:6379
EOF

# Check if .env changed
ENV_REMOTE_HASH=$(ssh "$SSH_USER@$SERVER_IP" "md5sum /opt/sandbox-api/.env 2>/dev/null | cut -d' ' -f1" || echo "none")
ENV_LOCAL_HASH=$(md5sum "$ENV_TEMP" | cut -d' ' -f1)

ENV_CHANGED=false
if [ "$ENV_REMOTE_HASH" != "$ENV_LOCAL_HASH" ]; then
    info ".env file changed, updating..."
    scp "$ENV_TEMP" "$SSH_USER@$SERVER_IP:/opt/sandbox-api/.env"
    ssh "$SSH_USER@$SERVER_IP" "chown sandboxapi:sandboxapi /opt/sandbox-api/.env && chmod 0600 /opt/sandbox-api/.env"
    ENV_CHANGED=true
else
    success ".env file unchanged"
fi
rm -f "$ENV_TEMP"

systemctl daemon-reload
systemctl enable sandbox-api

# Restart if service file, .env changed, or service not running
NEEDS_RESTART=false
if [ "$SERVICE_CHANGED" = true ]; then
    info "Restart needed: service file changed"
    NEEDS_RESTART=true
elif [ "$ENV_CHANGED" = true ]; then
    info "Restart needed: .env changed"
    NEEDS_RESTART=true
elif ! ssh "$SSH_USER@$SERVER_IP" "systemctl is-active --quiet sandbox-api" 2>/dev/null; then
    info "Restart needed: service not running"
    NEEDS_RESTART=true
fi

if [ "$NEEDS_RESTART" = true ]; then
    ssh "$SSH_USER@$SERVER_IP" "systemctl restart sandbox-api"
    success "sandbox-api restarted"
else
    success "sandbox-api running with current configuration"
fi

success "Hardened systemd service configured (runs as sandboxapi user, admin routes enabled)"

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
echo "Admin Configuration:"
echo "  Add to Vercel environment (ADMIN_API_KEY):"
echo "  $ADMIN_API_KEY"
echo ""
echo "DNS Setup:"
echo "  Add A record: $DOMAIN → $SERVER_IP"
echo "============================================================"
