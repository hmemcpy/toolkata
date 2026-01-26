# toolkata Environment: python
# Python 3 runtime with pip, extends bash environment
#
# This environment is for Python lessons.
# It includes everything from the bash environment plus Python 3 and pip.

FROM toolkata-env:bash

# Switch to root for package installation (parent image runs as sandbox user)
USER root

# Install Python 3 from wolfi-base packages
# Using minimal packages for security and size
RUN apk add --no-cache \
    python3 \
    py3-pip

# Verify installations
RUN python3 --version && pip3 --version

# Create symlinks for convenience (python -> python3, pip -> pip3)
RUN ln -sf /usr/bin/python3 /usr/bin/python && \
    ln -sf /usr/bin/pip3 /usr/bin/pip

# Configure pip for sandbox user
# Disable update check and use non-interactive mode
RUN pip config set global.disable-pip-version-check true && \
    pip config set global.progress_bar off

# Ensure .local/bin is in PATH for user-installed tools
RUN echo 'export PATH="$HOME/.local/bin:$PATH"' >> /home/toolkata/.bashrc && \
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> /home/sandbox/.bashrc

# Update .bashrc to show Python version in prompt
RUN cat <<'BASHRC' >> /home/toolkata/.bashrc

# Show Python version if requirements.txt or pyproject.toml exists
show_python_version() {
  if [ -f requirements.txt ] || [ -f pyproject.toml ] || [ -f setup.py ]; then
    echo " Python: $(python --version 2>/dev/null | cut -d' ' -f2)"
  fi
}

# Update prompt to show Python version when relevant
export PS1='\[\033[34m\]\w\[\033[0m\]\[\033[33m\]$(parse_git_branch)\[\033[0m\]\[\033[36m\]$(show_python_version)\[\033[0m\] \[\033[32m\]$\[\033[0m\] '
BASHRC

# Copy to sandbox user as well
RUN cp /home/toolkata/.bashrc /home/sandbox/.bashrc

# Copy entrypoint script
COPY --chown=sandbox:sandbox entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Switch back to sandbox user for runtime
USER sandbox

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
