# toolkata Sandbox Container
# Base image for running CLI tools in isolated environment
FROM debian:bookworm-slim

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install base dependencies and CLI tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install jj (Jujutsu VCS) from pre-built GitHub release
RUN JJ_VERSION="0.25.0" && \
    ARCH=$(dpkg --print-architecture) && \
    if [ "$ARCH" = "arm64" ]; then JJ_ARCH="aarch64"; else JJ_ARCH="x86_64"; fi && \
    curl -fsSL "https://github.com/jj-vcs/jj/releases/download/v${JJ_VERSION}/jj-v${JJ_VERSION}-${JJ_ARCH}-unknown-linux-musl.tar.gz" | \
    tar -xzf - --strip-components=0 -C /usr/local/bin ./jj && \
    chmod +x /usr/local/bin/jj

# Verify installations
RUN git --version && jj --version

# Create non-root user for running commands
RUN useradd -m -s /bin/bash sandbox && \
    usermod -aG sudo sandbox

# Create workspace directory
RUN mkdir -p /home/sandbox/workspace && \
    chown -R sandbox:sandbox /home/sandbox

# Configure git for sandbox user (default config)
RUN git config --global user.name "Sandbox User" && \
    git config --global user.email "sandbox@toolkata.com" && \
    git config --global init.defaultBranch main && \
    git config --global core.editor "vim"

# Configure jj for sandbox user (default config)
RUN mkdir -p /home/sandbox/.config/jj && \
    printf '[user]\nname = "Sandbox User"\nemail = "sandbox@toolkata.com"\n' > /home/sandbox/.config/jj/config.toml && \
    chown -R sandbox:sandbox /home/sandbox/.config

# Set working directory
WORKDIR /home/sandbox/workspace

# Switch to sandbox user
USER sandbox

# Keep container alive with entrypoint script
COPY --chown=sandbox:sandbox entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Expose no ports - containers are network-isolated
# Health check will be managed by the sandbox API

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
