#!/bin/bash
# Entry point for scala environment container
# Keeps container alive for Docker attach

set -e

# Display container info on start
echo "toolkata Sandbox Environment: scala"
echo "===================================="
echo "User: $(whoami)"
echo "Working directory: $(pwd)"
echo "scala-cli version: $(scala-cli version 2>/dev/null || echo 'not found')"
echo "===================================="
echo ""

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
