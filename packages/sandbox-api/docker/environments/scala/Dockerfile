# toolkata Environment: scala
# Scala 3 with scala-cli and pre-cached ZIO + Cats Effect libraries
#
# This environment is for Scala functional programming lessons (ZIO vs Cats Effect).
# It provides scala-cli with commonly used libraries pre-downloaded for faster compilation.

# Build stage: install scala-cli and pre-cache dependencies
FROM eclipse-temurin:21-jre AS builder

# Install scala-cli
RUN curl -fSL https://github.com/virtuslab/scala-cli/releases/download/v1.5.0/scala-cli-x86_64-pc-linux-gnu -o /usr/local/bin/scala-cli && \
    chmod +x /usr/local/bin/scala-cli

# Verify scala-cli installation
RUN scala-cli version

# Pre-cache ZIO 2.x dependencies
# Create a dummy Scala project that pulls in common ZIO libraries
RUN mkdir -p /tmp/zio-cache && \
    cd /tmp/zio-cache && \
    echo '//> using dep dev.zio::zio::2.1.14' > project.scala && \
    echo '//> using dep dev.zio::zio-streams::2.1.14' >> project.scala && \
    scala-cli compile project.scala && \
    rm -rf /tmp/zio-cache

# Pre-cache Cats Effect 3.x dependencies
RUN mkdir -p /tmp/ce-cache && \
    cd /tmp/ce-cache && \
    echo '//> using dep org.typelevel::cats-effect::3.5.7' > project.scala && \
    scala-cli compile project.scala && \
    rm -rf /tmp/ce-cache

# Final stage: extend base image
FROM toolkata-sandbox-base:latest

# Switch to root for package installation (base image runs as sandbox user)
USER root

# Install JVM (required for scala)
RUN apk add --no-cache openjdk-21-jre

# Copy scala-cli from builder stage
COPY --from=builder /usr/local/bin/scala-cli /usr/local/bin/scala-cli

# Copy ivy2 cache (pre-cached dependencies)
COPY --from=builder /root/.ivy2 /root/.ivy2
COPY --from=builder /root/.cache/scala-cli /root/.cache/scala-cli

# Verify installations
RUN scala-cli version

# Make cache directories writable for sandbox user
RUN mkdir -p /root/.ivy2 /root/.cache/scala-cli && \
    chown -R sandbox:sandbox /root/.ivy2 /root/.cache

# Copy entrypoint script
COPY --chown=sandbox:sandbox entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Switch back to sandbox user for runtime
USER sandbox

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
