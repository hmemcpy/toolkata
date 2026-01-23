#!/bin/bash
# Entry point for sandbox container
# Keeps container alive for Docker attach

set -e

# Display container info on start
echo "toolkata Sandbox Container"
echo "=========================="
echo "User: $(whoami)"
echo "Working directory: $(pwd)"
echo "Git version: $(git --version)"
echo "jj version: $(jj --version)"
echo "=========================="
echo ""

# Git and jj configs are pre-configured in the Docker image
# No runtime initialization needed (filesystem is read-only)

# If command provided, execute it; otherwise keep alive
if [ $# -gt 0 ]; then
  exec "$@"
else
  # Keep container running for interactive use
  echo "Sandbox ready. Attach with docker exec or use the WebSocket terminal."
  echo ""

  # Keep alive with sleep loop
  # The container will be stopped by the sandbox API when session expires
  while true; do
    sleep 3600
  done
fi
