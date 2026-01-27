#!/bin/bash
# Entry point for scala environment container
# Keeps container alive for Docker attach

set -e

# Set HOME explicitly for scala-cli cache
export HOME="/home/sandbox"

# Set JAVA_HOME and add to PATH for scala-cli to use system JDK
export JAVA_HOME="/usr/lib/jvm/java-21-openjdk"
export PATH="$JAVA_HOME/bin:$PATH"

# Workaround for scala-cli bloop component manager issue in Docker
# See: https://github.com/VirtusLab/scala-cli/issues/2039
export SCALA_CLI_OPTS="-Dbloop.component.sharenative=true"
export BLOOP_COMPILE_SERVER_OPTS="-Dbloop.component.sharenative=true"

# Display container info on start
echo "toolkata Sandbox Environment: scala"
echo "===================================="
echo "User: $(whoami)"
echo "Working directory: $(pwd)"
echo "HOME: $HOME"
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
