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

# Create non-root user for running commands (no sudo access)
RUN useradd -m -s /bin/bash sandbox

# Remove privilege escalation commands (su, sudo, newgrp, etc.)
RUN rm -f /usr/bin/su /usr/bin/sudo /usr/bin/newgrp /usr/bin/chsh /usr/bin/chfn /usr/bin/gpasswd \
    && rm -f /bin/su 2>/dev/null || true

# Create workspace directory
RUN mkdir -p /home/toolkata && \
    chown -R sandbox:sandbox /home/sandbox /home/toolkata

# Switch to sandbox user BEFORE configuring git (so configs go to correct user)
USER sandbox

# Configure git for sandbox user
RUN git config --global user.name "Sandbox User" && \
    git config --global user.email "sandbox@toolkata.com" && \
    git config --global init.defaultBranch main && \
    git config --global core.editor "vim"

# Configure jj for sandbox user
RUN mkdir -p /home/sandbox/.config/jj && \
    printf '[user]\nname = "Sandbox User"\nemail = "sandbox@toolkata.com"\n' > /home/sandbox/.config/jj/config.toml

# Create .bashrc with colored prompt and aliases
# Set HOME to /home/toolkata so ~ shows correctly in prompt
# PS1 shows relative path (blue) followed by $ (green)
RUN printf 'export TERM=xterm-256color\n' > /home/sandbox/.bashrc && \
    printf 'export HOME=/home/toolkata\n' >> /home/sandbox/.bashrc && \
    printf 'export PS1="\\[\\033[34m\\]\\w\\[\\033[0m\\] \\[\\033[32m\\]$\\[\\033[0m\\] "\n' >> /home/sandbox/.bashrc && \
    printf 'alias ls="ls --color=auto"\n' >> /home/sandbox/.bashrc && \
    printf 'alias grep="grep --color=auto"\n' >> /home/sandbox/.bashrc

# Enable git colors
RUN git config --global color.ui auto

# Enable jj colors (auto-enabled when TERM is set, but be explicit)
RUN printf '[ui]\ncolor = "auto"\n' >> /home/sandbox/.config/jj/config.toml

# Set working directory
WORKDIR /home/toolkata

# Keep container alive with entrypoint script
COPY --chown=sandbox:sandbox entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Expose no ports - containers are network-isolated
# Health check will be managed by the sandbox API

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
