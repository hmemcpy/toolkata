# toolkata Environment: typescript
# TypeScript validation environment with Node.js, tsx, typescript, and effect
#
# This environment is for TypeScript snippet validation (Effect vs ZIO comparisons).
# It extends the bash environment and adds TypeScript tooling.

FROM toolkata-env:bash

# Switch to root for package installation (parent image runs as sandbox user)
USER root

# Install Node.js 22 LTS from official repository
# Using wolfi-base packages for security and minimal size
RUN apk add --no-cache \
    nodejs-22 \
    npm

# Verify installations
RUN node --version && npm --version

# Install tsx (TypeScript execute), typescript, and effect globally
# Pin versions for reproducibility
RUN npm install -g \
    tsx@4.19.2 \
    typescript@5.7.3

# Install effect package globally (for tsc type checking)
# We install it separately to get the types in the right location
RUN npm install -g effect@3.12.6

# Set NODE_PATH so Node.js runtime can find globally installed modules
ENV NODE_PATH=/usr/local/lib/node_modules

# Make global node_modules readable by all users
RUN chmod -R go+rX /usr/local/lib/node_modules

# Create a default tsconfig.json in /home/toolkata (copied to sandbox on start)
# This configures TypeScript for ES2022 target with proper lib support
RUN mkdir -p /home/toolkata && \
    echo '{"compilerOptions":{"target":"ES2022","lib":["ES2022"],"module":"commonjs","esModuleInterop":true,"strict":true,"skipLibCheck":true,"moduleResolution":"bundler"}}' > /home/toolkata/tsconfig.json

# Verify installations
RUN tsx --version && tsc --version && npm list -g effect

# Configure npm for sandbox user
RUN npm config set loglevel error && \
    npm config set fund false && \
    npm config set audit false

# Copy entrypoint script
COPY --chown=sandbox:sandbox entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Switch back to sandbox user for runtime
USER sandbox

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
