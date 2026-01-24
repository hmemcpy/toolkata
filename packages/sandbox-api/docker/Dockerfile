# toolkata Sandbox Container
# Base image for running CLI tools in isolated environment
FROM debian:bookworm-slim

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install base dependencies and CLI tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    ca-certificates \
    nano \
    vim-tiny \
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

# Remove dangerous utilities for security hardening
RUN rm -f \
    # Privilege escalation
    /usr/bin/su /bin/su /usr/bin/sudo /usr/bin/newgrp \
    /usr/bin/chsh /usr/bin/chfn /usr/bin/gpasswd \
    /usr/bin/runuser /usr/sbin/runuser \
    /usr/bin/setpriv /usr/bin/sg \
    # Container escape vectors
    /usr/bin/chroot /usr/sbin/chroot \
    /usr/bin/nsenter /usr/bin/unshare \
    /usr/sbin/pivot_root \
    # Filesystem mounting
    /usr/bin/mount /bin/mount /usr/bin/umount /bin/umount \
    /usr/sbin/losetup /sbin/losetup \
    /usr/bin/mknod /bin/mknod \
    # User/group management (not needed in sandbox)
    /usr/sbin/useradd /usr/sbin/userdel /usr/sbin/usermod \
    /usr/sbin/adduser /usr/sbin/deluser \
    /usr/sbin/groupadd /usr/sbin/groupdel /usr/sbin/groupmod \
    /usr/sbin/addgroup /usr/sbin/delgroup \
    /usr/bin/passwd /usr/sbin/chpasswd /usr/sbin/newusers \
    # Package management (prevent installing software)
    /usr/bin/apt /usr/bin/apt-get /usr/bin/apt-cache \
    /usr/bin/apt-cdrom /usr/bin/apt-config /usr/bin/apt-key /usr/bin/apt-mark \
    /usr/bin/dpkg /usr/bin/dpkg-deb /usr/bin/dpkg-divert \
    /usr/bin/dpkg-query /usr/bin/dpkg-split /usr/bin/dpkg-trigger \
    # Network download (curl kept for potential tutorial use)
    /usr/bin/wget \
    2>/dev/null || true

# Create workspace directory
RUN mkdir -p /home/toolkata && \
    chown -R sandbox:sandbox /home/sandbox /home/toolkata

# Switch to sandbox user BEFORE configuring git (so configs go to correct user)
USER sandbox

# Configure git for sandbox user
RUN git config --global user.name "Sandbox User" && \
    git config --global user.email "sandbox@toolkata.com" && \
    git config --global init.defaultBranch main && \
    git config --global core.editor "vi"

# Configure jj for sandbox user
RUN mkdir -p /home/sandbox/.config/jj && \
    printf '[user]\nname = "Sandbox User"\nemail = "sandbox@toolkata.com"\n' > /home/sandbox/.config/jj/config.toml

# Create .bashrc with colored prompt (including git branch), and aliases
# Set HOME to /home/toolkata so ~ shows correctly in prompt
# PS1 shows: path (blue) + git branch (yellow) + $ (green)
RUN cat <<'BASHRC' > /home/sandbox/.bashrc
export TERM=xterm-256color
export HOME=/home/toolkata

# Parse git branch for prompt (works even before first commit)
parse_git_branch() {
  git symbolic-ref --short HEAD 2>/dev/null | sed 's/.*/ (&)/'
}

# Prompt: path (blue) + git branch (yellow) + $ (green)
export PS1='\[\033[34m\]\w\[\033[0m\]\[\033[33m\]$(parse_git_branch)\[\033[0m\] \[\033[32m\]$\[\033[0m\] '

alias ls="ls --color=auto"
alias grep="grep --color=auto"
BASHRC

# Enable git colors
RUN git config --global color.ui auto

# Enable jj colors (auto-enabled when TERM is set, but be explicit)
RUN printf '[ui]\ncolor = "auto"\n' >> /home/sandbox/.config/jj/config.toml

# Copy git and jj configs to /home/toolkata (since .bashrc sets HOME=/home/toolkata)
RUN cp /home/sandbox/.gitconfig /home/toolkata/.gitconfig && \
    mkdir -p /home/toolkata/.config && \
    cp -r /home/sandbox/.config/jj /home/toolkata/.config/

# Set working directory
WORKDIR /home/toolkata

# Keep container alive with entrypoint script
COPY --chown=sandbox:sandbox entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Expose no ports - containers are network-isolated
# Health check will be managed by the sandbox API

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
