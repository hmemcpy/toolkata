# toolkata Sandbox API

Ephemeral Docker container management for interactive terminal sandboxes. Runs on a VPS with gVisor for kernel-level isolation.

## Overview

The Sandbox API creates on-demand Docker containers that users can interact with via WebSocket. Each session is isolated, rate-limited, and automatically destroyed after timeout.

## Architecture

```
Frontend (Vercel) → Sandbox API (VPS) → Docker with gVisor → Ephemeral Containers
```

## Prerequisites

- Docker 24.0+
- gVisor (runsc runtime)
- Node.js 20+ or Bun 1.0+
- Linux VPS (4GB+ RAM recommended)

## VPS Setup with gVisor

### 1. Install Docker

**Ubuntu/Debian:**
```bash
# Add Docker's official GPG key
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Set up repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin

# Enable and start Docker
sudo systemctl enable docker
sudo systemctl start docker

# Add your user to docker group (optional, for development)
sudo usermod -aG docker $USER
```

### 2. Install gVisor (runsc runtime)

gVisor provides kernel-level isolation for sandbox containers.

```bash
# Add gVisor apt repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/gvisor-archive-keyring.gpg] https://storage.googleapis.com/gvisor/releases release main" | \
  sudo tee /etc/apt/sources.list.d/gvisor.list > /dev/null

# Add GPG key
curl -fsSL https://storage.googleapis.com/gvisor/releases/gvisor-archive-keyring.gpg | \
  sudo gpg --dearmor -o /usr/share/keyrings/gvisor-archive-keyring.gpg

# Install runsc
sudo apt-get update
sudo apt-get install -y runsc

# Verify installation
runsc --version
```

### 3. Configure Docker to use gVisor

**Option A: Use gVisor for all containers (simplest):**
```bash
# Create /etc/docker/daemon.json
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "runtimes": {
    "runsc": {
      "path": "/usr/bin/runsc"
    }
  },
  "default-runtime": "runsc",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

# Restart Docker
sudo systemctl restart docker
```

**Option B: Use gVisor only for sandbox-api containers (selective):**
```bash
# Create /etc/docker/daemon.json (keep default runc for other containers)
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
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

# Restart Docker
sudo systemctl restart docker
```

### 4. Build the sandbox container image

```bash
# From the repository root
cd packages/sandbox-api/docker

# Build the image
docker build -t toolkata-sandbox:latest .

# Verify it was built
docker images | grep toolkata-sandbox
```

### 5. Test container isolation

Verify that gVisor is working and containers cannot access the host:

```bash
# Test with gVisor
docker run --rm --runtime=runsc --network=none toolkata-sandbox:latest cat /proc/1/comm

# Expected output: "runsc-sandbox" (not "init" or host process)
# If you see host processes, gVisor is not configured correctly
```

Additional isolation tests:

```bash
# Network isolation (should fail)
docker run --rm --runtime=runsc --network=none toolkata-sandbox:latest ping -c 1 8.8.8.8

# Filesystem isolation (should not see host files)
docker run --rm --runtime=runsc --network=none toolkata-sandbox:latest ls -la /home

# Memory limits (should enforce 128MB limit)
docker run --rm --runtime=runsc --network=none --memory=128m toolkata-sandbox:latest
```

## Deployment

### 1. Create dedicated user

```bash
# Create system user for running the service
sudo useradd -r -s /bin/false sandboxapi

# Create installation directory
sudo mkdir -p /opt/sandbox-api
sudo chown sandboxapi:sandboxapi /opt/sandbox-api
```

### 2. Install dependencies

```bash
# Install Bun (recommended for performance)
curl -fsSL https://bun.sh/install | bash

# Or install Node.js
# sudo apt-get install -y nodejs npm
```

### 3. Deploy application files

```bash
# Copy application files
sudo cp -r packages/sandbox-api/* /opt/sandbox-api/
sudo chown -R sandboxapi:sandboxapi /opt/sandbox-api

# Install dependencies
cd /opt/sandbox-api
sudo -u sandboxapi bun install

# Create log directory
sudo mkdir -p /var/log/sandbox-api
sudo chown sandboxapi:sandboxapi /var/log/sandbox-api
```

### 4. Configure environment

```bash
# Copy environment template
sudo cp /opt/sandbox-api/.env.example /opt/sandbox-api/.env

# Edit environment variables
sudo nano /opt/sandbox-api/.env
```

Edit `/opt/sandbox-api/.env`:
```env
PORT=3001
HOST=0.0.0.0
FRONTEND_ORIGIN=https://toolkata.dev
DOCKER_HOST=/var/run/docker.sock
```

### 5. Install systemd service

```bash
# Copy service file
sudo cp /opt/sandbox-api/deploy/sandbox-api.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable service (start on boot)
sudo systemctl enable sandbox-api

# Start service
sudo systemctl start sandbox-api

# Check status
sudo systemctl status sandbox-api

# View logs
sudo journalctl -u sandbox-api -f
```

### 6. Configure Caddy reverse proxy

**Install Caddy:**
```bash
# Add Caddy repository
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list

# Install Caddy
sudo apt update
sudo apt install caddy
```

**Configure Caddy:**
```bash
# Copy Caddyfile
sudo cp /opt/sandbox-api/deploy/Caddyfile /etc/caddy/Caddyfile

# Validate configuration
sudo caddy validate --config /etc/caddy/Caddyfile

# Reload Caddy
sudo systemctl reload caddy
```

### 7. Configure DNS

Point `sandbox.toolkata.dev` to your VPS's IPv4 address.

### 8. Verify deployment

```bash
# Check health endpoint
curl https://sandbox.toolkata.dev/health

# Expected output:
# {"status":"ok","containers":0,"uptime":"..."}

# Check service status
sudo systemctl status sandbox-api
sudo systemctl status caddy

# Check Docker containers
docker ps -a

# View recent logs
sudo journalctl -u sandbox-api -n 50 --no-pager
```

## Monitoring

### Health checks

The `/health` endpoint returns:
```json
{
  "status": "ok",
  "containers": 3,
  "uptime": "2h15m30s"
}
```

### Logs

```bash
# Sandbox API logs
sudo journalctl -u sandbox-api -f

# Caddy access logs
sudo tail -f /var/log/caddy/sandbox-api.log

# Docker logs (container creation)
sudo journalctl -u docker -f
```

### Metrics (optional)

Consider setting up:
- Prometheus + Grafana for metrics
- Uptime monitoring (e.g., UptimeRobot, Better Uptime)
- Alerting for high memory/CPU usage

## Security Considerations

### Container isolation

- **gVisor runsc**: Kernel-level syscall interception
- **--network=none**: No network access
- **--read-only**: Read-only root filesystem
- **--cap-drop=ALL**: No Linux capabilities
- **--security-opt=no-new-privileges**: No privilege escalation
- **Resource limits**: Memory, CPU, processes, file descriptors

### Rate limiting

- Per-IP session limits (10/hour, 2 concurrent)
- Command rate limiting (60/minute)
- Session timeout (5 min idle, 30 min max)

### Service hardening

- **NoNewPrivileges**: Service cannot gain new privileges
- **ProtectSystem=strict**: Read-only system directories
- **PrivateTmp**: Isolated /tmp
- **MemoryMax/CPUQuota**: Resource limits
- **Non-root user**: Runs as `sandboxapi` user

## Troubleshooting

### Containers not starting

```bash
# Check Docker daemon
sudo systemctl status docker

# Check gVisor runtime
docker info | grep runsc

# Test container creation
docker run --rm --runtime=runsc toolkata-sandbox:latest echo "test"
```

### WebSocket connection fails

```bash
# Check Caddy is running
sudo systemctl status caddy

# Check Caddy configuration
sudo caddy validate --config /etc/caddy/Caddyfile

# Check firewall rules
sudo ufw status
sudo iptables -L -n | grep 3001
```

### High memory usage

```bash
# Check container memory usage
docker stats --no-stream

# Check active sessions
curl https://sandbox.toolkata.dev/health

# Kill orphaned containers
docker ps -a | grep "sandbox-" | awk '{print $1}' | xargs -r docker rm -f
```

### Permission errors

```bash
# Check user permissions
id sandboxapi

# Check file ownership
ls -la /opt/sandbox-api

# Fix ownership
sudo chown -R sandboxapi:sandboxapi /opt/sandbox-api
```

## Development

Run locally (without gVisor):

```bash
# From packages/sandbox-api
bun run dev

# Or with Docker build
docker build -t toolkata-sandbox:latest ./docker
```

Run tests:

```bash
bun run test
```

## License

MIT
