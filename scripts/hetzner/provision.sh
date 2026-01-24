#!/bin/bash
# provision.sh - Provisions Hetzner Cloud infrastructure for toolkata sandbox
#
# Prerequisites:
#   1. Hetzner Cloud account
#   2. hcloud CLI installed: brew install hcloud
#   3. hcloud CLI configured: hcloud context create toolkata
#
# Usage:
#   ./scripts/hetzner/provision.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ============================================================
# CONFIGURATION
# ============================================================
SERVER_NAME="toolkata-sandbox"
SERVER_TYPE="cax11"        # 4GB RAM, 2 vCPU ARM64, ~€3.79/mo
IMAGE="ubuntu-24.04"
LOCATION="nbg1"            # Nuremberg, Germany
SSH_KEY_NAME="toolkata"
SSH_PUBLIC_KEY_PATH="${SSH_PUBLIC_KEY_PATH:-$HOME/.ssh/id_ed25519.pub}"

# ============================================================
# COLORS
# ============================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info() { echo -e "${BLUE}ℹ${NC}  $1"; }
success() { echo -e "${GREEN}✓${NC}  $1"; }
warn() { echo -e "${YELLOW}⚠${NC}  $1"; }
error() { echo -e "${RED}✗${NC}  $1"; exit 1; }

echo ""
echo "============================================================"
echo "  toolkata Sandbox - Hetzner Cloud Provisioning"
echo "============================================================"
echo ""

# ============================================================
# PREFLIGHT CHECKS
# ============================================================
if ! command -v hcloud &> /dev/null; then
  error "hcloud CLI not found. Install with: brew install hcloud"
fi

if ! hcloud context active &> /dev/null; then
  error "No active hcloud context. Run: hcloud context create toolkata"
fi

success "hcloud CLI configured"

# Check SSH key
if [ ! -f "$SSH_PUBLIC_KEY_PATH" ]; then
  # Try RSA key as fallback
  if [ -f "$HOME/.ssh/id_rsa.pub" ]; then
    SSH_PUBLIC_KEY_PATH="$HOME/.ssh/id_rsa.pub"
  else
    error "SSH public key not found at: $SSH_PUBLIC_KEY_PATH"
  fi
fi

success "SSH key found: $SSH_PUBLIC_KEY_PATH"

# ============================================================
# 1. CREATE OR FIND SSH KEY
# ============================================================
echo ""
info "Setting up SSH key..."

if hcloud ssh-key describe "$SSH_KEY_NAME" &> /dev/null; then
  warn "SSH key '$SSH_KEY_NAME' already exists, reusing"
else
  hcloud ssh-key create --name "$SSH_KEY_NAME" --public-key-from-file "$SSH_PUBLIC_KEY_PATH"
  success "SSH key '$SSH_KEY_NAME' created"
fi

# ============================================================
# 2. CREATE SERVER
# ============================================================
echo ""
info "Creating server: $SERVER_NAME"
info "  Type: $SERVER_TYPE (4GB RAM, 2 vCPU ARM64)"
info "  Location: $LOCATION"
info "  Image: $IMAGE"

if hcloud server describe "$SERVER_NAME" &> /dev/null; then
  warn "Server '$SERVER_NAME' already exists"
  SERVER_IP=$(hcloud server ip "$SERVER_NAME")
else
  # Try primary location, fall back to others if unavailable
  LOCATIONS=("nbg1" "fsn1" "hel1")
  SERVER_CREATED=false

  for LOC in "${LOCATIONS[@]}"; do
    info "Trying location: $LOC..."
    if hcloud server create \
      --name "$SERVER_NAME" \
      --type "$SERVER_TYPE" \
      --image "$IMAGE" \
      --location "$LOC" \
      --ssh-key "$SSH_KEY_NAME" 2>&1; then
      LOCATION="$LOC"
      SERVER_CREATED=true
      break
    else
      warn "Location $LOC unavailable, trying next..."
    fi
  done

  if [ "$SERVER_CREATED" = false ]; then
    error "Failed to create server in any location"
  fi

  SERVER_IP=$(hcloud server ip "$SERVER_NAME")
  success "Server created"
fi

success "Server IP: $SERVER_IP"

# ============================================================
# 3. WAIT FOR SSH
# ============================================================
echo ""
info "Waiting for SSH to become available..."

for i in {1..30}; do
  if ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 "root@$SERVER_IP" "echo ok" &> /dev/null; then
    success "SSH is ready"
    break
  fi
  sleep 2
done

# ============================================================
# 4. INSTALL SOFTWARE
# ============================================================
echo ""
info "Installing Docker, gVisor, Bun, Caddy..."

ssh -o StrictHostKeyChecking=no "root@$SERVER_IP" 'bash -s' << 'SETUP'
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

echo "=== Installing Docker ==="
apt-get update
apt-get install -y ca-certificates curl unzip
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin

echo "=== Installing gVisor (runsc) ==="
curl -fsSL https://gvisor.dev/archive.key | gpg --dearmor -o /usr/share/keyrings/gvisor-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/gvisor-archive-keyring.gpg] https://storage.googleapis.com/gvisor/releases release main" | tee /etc/apt/sources.list.d/gvisor.list > /dev/null
apt-get update
apt-get install -y runsc

# Configure Docker to use runsc and log rotation
cat > /etc/docker/daemon.json << 'EOF'
{
  "runtimes": {
    "runsc": {
      "path": "/usr/bin/runsc"
    }
  },
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
systemctl restart docker

echo "=== Installing Bun 1.3.6 (system-wide) ==="
curl -fsSL https://bun.sh/install | BUN_INSTALL=/usr/local bash -s "bun-v1.3.6"
# Symlink to /usr/bin for fallback
ln -sf /usr/local/bin/bun /usr/bin/bun
echo "Bun 1.3.6 installed to /usr/local/bin/bun"
bun --version

echo "=== Installing Caddy ==="
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update
apt-get install -y caddy

echo "=== Installing unattended-upgrades for automatic security patches ==="
apt-get install -y unattended-upgrades

# Configure unattended-upgrades
cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}";
    "${distro_id}:${distro_codename}-security";
    // "${distro_id}:${distro_codename}-updates";
    // "${distro_id}:${distro_codename}-proposed";
    // "${distro_id}:${distro_codename}-backports";
};

// Auto clean unused dependencies
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::AutoFixInterruptedDpkg "true";

// Send email to root on errors (requires mail setup)
Unattended-Upgrade::Mail "root";
Unattended-Upgrade::MailOnlyOnError "true";

// Reboot automatically if needed (set to "true" to enable)
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Automatic-Reboot-Time "02:00";

// Log all upgrades
Unattended-Upgrade::Verbose "false";
Unattended-Upgrade::Debug "false";
EOF

# Enable auto-updates via apt-periodic
cat > /etc/apt/apt.conf.d/20auto-upgrades << 'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
// Check for updates daily
APT::Periodic::Update-Package-Lists "1";
// Download upgrades daily
APT::Periodic::Download-Upgradeable-Packages "1";
// Install upgrades daily
APT::Periodic::Unattended-Upgrade "1";
// Clean apt cache weekly
APT::Periodic::AutocleanInterval "7";
EOF

# Enable and start unattended-upgrades timer
systemctl enable unattended-upgrades
systemctl start unattended-upgrades

echo "=== Installing fail2ban for SSH protection ==="
apt-get install -y fail2ban

# Create fail2ban local configuration for SSH
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
# Ban IPs for 1 hour
bantime = 3600
# Find failures in last 10 minutes
findtime = 600
# Ban after 3 failed attempts
maxretry = 3
# Use iptables for firewall
banaction = iptables-multiport

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

[sshd-ddos]
enabled = true
port = ssh
filter = sshd-ddos
logpath = /var/log/auth.log
maxretry = 2
bantime = 7200
EOF

# Enable and start fail2ban
systemctl enable fail2ban
systemctl start fail2ban

echo "=== fail2ban installed and configured ==="

echo "=== Configuring ufw firewall ==="
# Install ufw if not present
apt-get install -y ufw

# Reset any existing rules to known state
ufw --force reset

# Set default policies: deny incoming, allow outgoing
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (port 22) - rate limited to prevent brute force
# Note: fail2ban provides additional protection
ufw limit 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Allow Docker bridge network traffic (for container networking)
ufw allow from 172.16.0.0/12
ufw allow from 192.168.0.0/16

# Allow localhost
ufw allow from 127.0.0.1

# Enable firewall (non-interactive)
ufw --force enable

echo "=== ufw configured and enabled ==="
echo "=== Active rules ==="
ufw status verbose

echo "=== Hardening SSH configuration ==="
# Disable password authentication and interactive challenges
sed -i 's/^#\\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\\?KbdInteractiveAuthentication.*/KbdInteractiveAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\\?ChallengeResponseAuthentication.*/ChallengeResponseAuthentication no/' /etc/ssh/sshd_config
# Allow root login only with keys (safer than passwords); adjust if you want to disable root entirely
sed -i 's/^#\\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config

# Reload SSH service to apply changes
systemctl reload ssh

echo "=== Configuring logrotate for sandbox-api ==="
# Install logrotate if not present
apt-get install -y logrotate

# Create logrotate configuration for sandbox-api
cat > /etc/logrotate.d/sandbox-api << 'EOF'
# toolkata Sandbox API - logrotate configuration
/var/log/sandbox-api/*.log {
  daily
  rotate 30
  notifempty
  create 0644 sandboxapi sandboxapi
  compress
  delaycompress
  size 1k
  dateext
  dateformat -%Y-%m-%d
  missingok
  copytruncate
  maxsize 100M
  minage 1d
}
EOF

# Create log directory for sandbox-api
mkdir -p /var/log/sandbox-api

echo "=== logrotate configured ==="

echo "=== Testing gVisor ==="
docker run --runtime=runsc --rm hello-world

echo "=== Setup complete ==="
SETUP

success "Software installed"

# ============================================================
# 5. SAVE CONFIGURATION
# ============================================================
cat > "$SCRIPT_DIR/sandbox.env" << EOF
# Hetzner Cloud sandbox infrastructure
# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

SERVER_NAME=$SERVER_NAME
SERVER_IP=$SERVER_IP
SERVER_TYPE=$SERVER_TYPE
LOCATION=$LOCATION
REGION=eu-central
SSH_USER=root
EOF

success "Configuration saved to: $SCRIPT_DIR/sandbox.env"

# ============================================================
# 6. OUTPUT SUMMARY
# ============================================================
echo ""
echo "============================================================"
echo -e "${GREEN}  ✓ PROVISIONING COMPLETE${NC}"
echo "============================================================"
echo ""
echo "Server Details:"
echo "  Name:      $SERVER_NAME"
echo "  IP:        $SERVER_IP"
echo "  Type:      $SERVER_TYPE (4GB RAM, 2 vCPU ARM64)"
echo "  Location:  $LOCATION"
echo "  Cost:      ~€3.79/mo"
echo ""
echo "Connect via SSH:"
echo "  ssh root@$SERVER_IP"
echo ""
echo "Next steps:"
echo "  1. Add DNS A record: sandbox.toolkata.com → $SERVER_IP"
echo "  2. Deploy: ./scripts/hetzner/deploy.sh"
echo "============================================================"
