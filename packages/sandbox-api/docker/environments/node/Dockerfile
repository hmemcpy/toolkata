# toolkata Environment: node
# Node.js LTS runtime with npm, extends bash environment
#
# This environment is for JavaScript/TypeScript lessons.
# It includes everything from the bash environment plus Node.js and npm.

FROM toolkata-env:bash

# Switch to root for package installation (parent image runs as sandbox user)
USER root

# Install Node.js LTS from official repository
# Using wolfi-base packages for security and minimal size
RUN apk add --no-cache \
    nodejs-20 \
    npm

# Verify installations
RUN node --version && npm --version

# Configure npm for sandbox user
# Use non-interactive mode and set default registry
RUN npm config set loglevel error && \
    npm config set fund false && \
    npm config set audit false

# Update .bashrc to show Node.js version in prompt
RUN cat <<'BASHRC' >> /home/toolkata/.bashrc

# Show Node.js version if package.json exists
show_node_version() {
  if [ -f package.json ]; then
    echo " Node.js: $(node --version)"
  fi
}

# Update prompt to show Node.js version when relevant
export PS1='\[\033[34m\]\w\[\033[0m\]\[\033[33m\]$(parse_git_branch)\[\033[0m\]\[\033[36m\]$(show_node_version)\[\033[0m\] \[\033[32m\]$\[\033[0m\] '
BASHRC

# Copy to sandbox user as well
RUN cp /home/toolkata/.bashrc /home/sandbox/.bashrc

# Copy entrypoint script
COPY --chown=sandbox:sandbox entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Switch back to sandbox user for runtime
USER sandbox

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
