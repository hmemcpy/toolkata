# toolkata Environment: tmux
# Bash shell with tmux terminal multiplexer installed
#
# This environment is for tmux tutorials.
# It extends the bash environment (with git/jj) and adds tmux.
#
# Note: PID limit of 50 may limit concurrent panes in tmux sessions.

FROM toolkata-env:bash

# Switch to root for package installation
USER root

# Install tmux
# Remove su/sudo after install (apk may reinstall busybox symlinks)
RUN apk add --no-cache tmux && \
    rm -f /bin/su /usr/bin/su /sbin/su /usr/sbin/su 2>/dev/null || true

# Verify tmux installation
RUN tmux -V

# Copy custom .bashrc for tmux
# NOTE: No 'stty -echo' because tmux manages its own PTY handling
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
RUN cp /home/toolkata/.bashrc /home/sandbox/.bashrc

# Copy entrypoint script
COPY --chown=sandbox:sandbox entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Switch back to sandbox user for runtime
USER sandbox

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
