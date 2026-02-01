# toolkata Sandbox Base Image
# Chainguard-based minimal base for all toolkata sandbox containers
#
# This image provides:
# - Non-root sandbox user
# - UTF-8 locale support
# - Bash shell with colored prompt
# - Security-hardened baseline (no curl, wget, sudo, etc.)
#
# Tool-pair specific images extend this base to add their required tools.

FROM cgr.dev/chainguard/wolfi-base:latest

# Install minimal runtime packages
# - bash: Interactive shell for terminal
# - glibc-locale-en: UTF-8 locale support
RUN apk add --no-cache \
    bash \
    glibc-locale-en && \
    # Remove dangerous tools that come with base image
    rm -f /bin/su /usr/bin/su /sbin/su /usr/sbin/su 2>/dev/null || true

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

# Switch to sandbox user BEFORE configuring
USER sandbox

# Create .bash_profile to source .bashrc for login shells
RUN printf 'if [ -f ~/.bashrc ]; then . ~/.bashrc; fi\n' > /home/sandbox/.bash_profile

# Create .bashrc with colored prompt and locale
# PS1 shows: path (blue) + $ (green)
# Tool-pair images may add git branch parsing to this prompt
RUN cat <<'BASHRC' > /home/sandbox/.bashrc
export TERM=xterm-256color
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

# Disable PTY echo - Bun's PTY handles echo, Docker's PTY would double it
# Only run if we're in an interactive terminal
[[ $- == *i* ]] && stty -echo 2>/dev/null

# Prompt: path (blue) + $ (green)
export PS1='\[\033[34m\]\w\[\033[0m\] \[\033[32m\]$\[\033[0m\] '

alias ls="ls --color=auto"
alias grep="grep --color=auto"
BASHRC

# Copy bash files to /home/toolkata (will be HOME during runtime)
RUN cp /home/sandbox/.bashrc /home/toolkata/.bashrc && \
    cp /home/sandbox/.bash_profile /home/toolkata/.bash_profile

# Now set HOME to /home/toolkata for runtime
ENV HOME=/home/toolkata

# Set working directory
WORKDIR /home/toolkata

# Copy entrypoint script (will be overridden by tool-pair images if needed)
COPY --chown=sandbox:sandbox entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
