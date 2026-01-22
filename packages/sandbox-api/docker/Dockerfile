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

# Install jj (Jujutsu VCS) from cargo package manager
# Note: jj-cli 0.37.0 requires Rust 2024 edition, so we need rustup for a newer toolchain
RUN JJ_VERSION="0.37.0" && \
    apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    build-essential \
    && rm -rf /var/lib/apt/lists/* && \
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable --profile minimal && \
    . /root/.cargo/env && \
    cargo install jj-cli --version "${JJ_VERSION}" && \
    mv /root/.cargo/bin/jj /usr/local/bin/jj && \
    chmod +x /usr/local/bin/jj && \
    rm -rf /root/.cargo/registry /root/.cargo/git && \
    rm -rf /root/.rustup && \
    rm /root/.cargo/env

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
    git config --global user.email "sandbox@toolkata.dev" && \
    git config --global init.defaultBranch main && \
    git config --global core.editor "vim"

# Configure jj for sandbox user (default config)
RUN mkdir -p /home/sandbox/.config/jj && \
    printf '[user]\nname = "Sandbox User"\nemail = "sandbox@toolkata.dev"\n' > /home/sandbox/.config/jj/config.toml && \
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
