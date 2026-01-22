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

# Create a default .gitconfig if not exists (for colocated repos)
if [ ! -f "/home/sandbox/.gitconfig" ]; then
  echo "Initializing git config..."
  git config --global user.name "Sandbox User"
  git config --global user.email "sandbox@toolkata.com"
  git config --global init.defaultBranch main
fi

# Create jj config directory if not exists
if [ ! -d "/home/sandbox/.config/jj" ]; then
  mkdir -p /home/sandbox/.config/jj
  printf '[user]\nname = "Sandbox User"\nemail = "sandbox@toolkata.com"\n' > /home/sandbox/.config/jj/config.toml
fi

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
