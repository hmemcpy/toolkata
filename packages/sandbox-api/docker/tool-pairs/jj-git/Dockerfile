# toolkata Sandbox: jj-git Tool Pair
# Extends base image with git and jj (Jujutsu VCS)
#
# This image provides everything needed for git/jj comparison lessons.

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

# Final stage: extend base image
FROM toolkata-sandbox-base:latest

# Install git (jj is copied from builder stage)
RUN apk add --no-cache git

# Copy jj binary from builder stage
COPY --from=builder /tmp/jj /usr/bin/jj

# Verify installations
RUN git --version && jj --version

# Configure git for sandbox user
# Using "true" as editor (no-op) since no text editors are installed
# Users should use -m flag for commit messages: git commit -m "message"
RUN git config --global user.name "Sandbox User" && \
    git config --global user.email "sandbox@toolkata.com" && \
    git config --global init.defaultBranch main && \
    git config --global core.editor "true" && \
    git config --global color.ui auto

# Configure jj for sandbox user
# Users should use -m flag: jj describe -m "message"
RUN mkdir -p /home/toolkata/.config/jj && \
    printf '[user]\nname = "Sandbox User"\nemail = "sandbox@toolkata.com"\n\n[ui]\ncolor = "auto"\neditor = "true"\n' > /home/toolkata/.config/jj/config.toml

# Update .bashrc to add git branch parsing to prompt
# PS1 shows: path (blue) + git branch (yellow) + $ (green)
RUN cat <<'BASHRC' > /home/toolkata/.bashrc
export TERM=xterm-256color
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

# Copy config to sandbox user home as well
RUN cp /home/toolkata/.gitconfig /home/sandbox/.gitconfig && \
    cp /home/toolkata/.bashrc /home/sandbox/.bashrc && \
    mkdir -p /home/sandbox/.config && \
    cp -r /home/toolkata/.config/jj /home/sandbox/.config/

# Copy entrypoint script (same as base)
COPY --chown=sandbox:sandbox entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
