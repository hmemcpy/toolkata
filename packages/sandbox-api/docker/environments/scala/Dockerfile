# toolkata Environment: scala
# Scala 3 with scala-cli for functional programming lessons
#
# This environment is for Scala functional programming lessons (ZIO vs Cats Effect).

# Build stage: install scala-cli
FROM eclipse-temurin:21-jre AS builder

# Install scala-cli (detect architecture)
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "aarch64" ]; then \
        SCALA_CLI_ASSET="scala-cli-aarch64-pc-linux.gz"; \
    else \
        SCALA_CLI_ASSET="scala-cli-x86_64-pc-linux.gz"; \
    fi && \
    curl -fSL "https://github.com/virtuslab/scala-cli/releases/download/v1.5.0/$SCALA_CLI_ASSET" | gunzip > /usr/local/bin/scala-cli && \
    chmod +x /usr/local/bin/scala-cli

# Verify scala-cli installation
RUN scala-cli version

# Final stage: extend base image
FROM toolkata-sandbox-base:latest

# Switch to root for package installation
USER root

# Install JVM (required for scala)
RUN apk add --no-cache openjdk-21-jre

# Copy scala-cli from builder stage
COPY --from=builder /usr/local/bin/scala-cli /usr/local/bin/scala-cli

# Verify installations
RUN scala-cli version

# Create and set up cache directories for scala-cli
# The cache needs to be writable by the sandbox user
RUN mkdir -p /home/sandbox/.cache/scala-cli /home/sandbox/.cache/bloop /home/sandbox/.ivy2/cache && \
    chown -R sandbox:sandbox /home/sandbox/.cache /home/sandbox/.ivy2 && \
    chmod -R u+w /home/sandbox/.cache /home/sandbox/.ivy2

# Copy entrypoint script
COPY --chown=sandbox:sandbox entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Switch back to sandbox user for runtime
USER sandbox

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
