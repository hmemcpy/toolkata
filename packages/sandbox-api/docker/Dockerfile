# toolkata Sandbox Container
# Chainguard-based minimal image for running CLI tools in isolated environment
#
# Benefits over debian:bookworm-slim:
# - ~85% smaller image size
# - Daily security rebuilds with automatic CVE patching
# - Hardened by design (minimal attack surface)
# - No manual binary removal needed

# Build stage: download jj binary
FROM cgr.dev/chainguard/wolfi-base:latest AS builder

RUN apk add --no-cache curl

# Download jj (Jujutsu VCS) from pre-built GitHub release
RUN JJ_VERSION="0.25.0" && \
    ARCH=$(uname -m) && \
    if [ "$ARCH" = "aarch64" ]; then JJ_ARCH="aarch64"; else JJ_ARCH="x86_64"; fi && \
    curl -fsSL "https://github.com/jj-vcs/jj/releases/download/v${JJ_VERSION}/jj-v${JJ_VERSION}-${JJ_ARCH}-unknown-linux-musl.tar.gz" | \
    tar -xzf - --strip-components=0 -C /tmp ./jj && \
    chmod +x /tmp/jj

# Final stage: minimal runtime image
FROM cgr.dev/chainguard/wolfi-base:latest

# Install required packages via apk (Wolfi ecosystem)
# - bash: Interactive shell for terminal
# - git: Version control
# - glibc-locale-en: UTF-8 locale support
# Note: No text editors (use -m flag), no curl/wget (no network access)
RUN apk add --no-cache \
    bash \
    git \
    glibc-locale-en && \
    # Remove dangerous tools that come with base image
    rm -f /bin/su /usr/bin/su /sbin/su /usr/sbin/su 2>/dev/null || true

# Copy jj binary from builder stage
COPY --from=builder /tmp/jj /usr/bin/jj

# Verify installations
RUN git --version && jj --version

# Set UTF-8 locale environment variables
ENV LANG=en_US.UTF-8
ENV LC_ALL=en_US.UTF-8
ENV LANGUAGE=en_US:en
ENV TERM=xterm-256color

# Create non-root user for running commands
RUN adduser -D -s /bin/bash -h /home/sandbox sandbox

# Create workspace directory
RUN mkdir -p /home/toolkata && \
    chown -R sandbox:sandbox /home/sandbox /home/toolkata

# Switch to sandbox user BEFORE configuring git (so configs go to correct user)
USER sandbox

# Configure git for sandbox user
# Using "true" as editor (no-op) since no text editors are installed
# Users should use -m flag for commit messages: git commit -m "message"
RUN git config --global user.name "Sandbox User" && \
    git config --global user.email "sandbox@toolkata.com" && \
    git config --global init.defaultBranch main && \
    git config --global core.editor "true" && \
    git config --global color.ui auto

# Configure jj for sandbox user
# Using "true" as editor (no-op) since no text editors are installed
# Users should use -m flag: jj describe -m "message"
RUN mkdir -p /home/sandbox/.config/jj && \
    printf '[user]\nname = "Sandbox User"\nemail = "sandbox@toolkata.com"\n\n[ui]\ncolor = "auto"\neditor = "true"\n' > /home/sandbox/.config/jj/config.toml

# Create .bashrc with colored prompt (including git branch), locale, and aliases
# Set HOME to /home/toolkata so ~ shows correctly in prompt
# PS1 shows: path (blue) + git branch (yellow) + $ (green)
RUN cat <<'BASHRC' > /home/sandbox/.bashrc
export TERM=xterm-256color
export HOME=/home/toolkata
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

# Parse git branch for prompt (works even before first commit)
parse_git_branch() {
  git symbolic-ref --short HEAD 2>/dev/null | sed 's/.*/ (&)/'
}

# Prompt: path (blue) + git branch (yellow) + $ (green)
export PS1='\[\033[34m\]\w\[\033[0m\]\[\033[33m\]$(parse_git_branch)\[\033[0m\] \[\033[32m\]$\[\033[0m\] '

alias ls="ls --color=auto"
alias grep="grep --color=auto"
BASHRC

# Copy git and jj configs to /home/toolkata (since .bashrc sets HOME=/home/toolkata)
RUN cp /home/sandbox/.gitconfig /home/toolkata/.gitconfig && \
    mkdir -p /home/toolkata/.config && \
    cp -r /home/sandbox/.config/jj /home/toolkata/.config/

# Set working directory
WORKDIR /home/toolkata

# Copy entrypoint script
COPY --chown=sandbox:sandbox entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
