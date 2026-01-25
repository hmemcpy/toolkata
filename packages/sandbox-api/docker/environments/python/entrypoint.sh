#!/bin/bash
# Entry point for python environment container
# Keeps container alive for Docker attach

set -e

# Display container info on start
echo "toolkata Sandbox Environment: python"
echo "===================================="
echo "User: $(whoami)"
echo "Working directory: $(pwd)"
echo "Python: $(python3 --version 2>/dev/null || echo 'not installed')"
echo "pip: $(pip3 --version 2>/dev/null || echo 'not installed')"
echo "===================================="
echo ""

# Copy bash files to /home/toolkata (tmpfs mount wipes files from image)
cp /home/sandbox/.bashrc /home/toolkata/.bashrc 2>/dev/null || true
cp /home/sandbox/.bash_profile /home/toolkata/.bash_profile 2>/dev/null || true

# If command provided, execute it; otherwise keep alive
if [ $# -gt 0 ]; then
  exec "$@"
else
  # Keep container running for interactive use
  echo "Sandbox ready. Attach with docker exec or use the WebSocket terminal."
  echo ""

  # Keep alive with sleep loop
  while true; do
    sleep 3600
  done
fi
