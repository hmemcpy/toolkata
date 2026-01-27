# toolkata Environment: scala
# Scala 3 with scala-cli for functional programming lessons
#
# This environment is for Scala functional programming lessons (ZIO vs Cats Effect).
# Uses --server=false to skip Bloop and pre-caches ZIO + Cats Effect dependencies.

# Build stage: download scala-cli and pre-cache dependencies
FROM eclipse-temurin:21-jre AS builder

# Download latest scala-cli release (detect architecture)
RUN ARCH=$(uname -m) && \
    LATEST_TAG=$(curl -sL "https://api.github.com/repos/VirtusLab/scala-cli/releases/latest" | grep '"tag_name"' | cut -d'"' -f4) && \
    echo "Installing scala-cli ${LATEST_TAG} for ${ARCH}" && \
    curl -fSL "https://github.com/VirtusLab/scala-cli/releases/download/${LATEST_TAG}/scala-cli-${ARCH}-pc-linux.gz" | gunzip > /usr/local/bin/scala-cli && \
    chmod +x /usr/local/bin/scala-cli

# Verify scala-cli installation
RUN scala-cli version

# Pre-cache ZIO and Cats Effect dependencies using --server=false (no Bloop)
RUN mkdir -p /tmp/warmup

# Pre-cache ZIO 2.1.x (using --server=false to avoid Bloop)
RUN echo '//> using dep "dev.zio::zio:2.1.14"' > /tmp/warmup/zio.scala && \
    echo 'import zio._' >> /tmp/warmup/zio.scala && \
    echo 'object ZioWarmup { val x: UIO[Int] = ZIO.succeed(42) }' >> /tmp/warmup/zio.scala && \
    scala-cli compile --server=false /tmp/warmup/zio.scala && \
    echo "ZIO cached successfully"

# Pre-cache Cats Effect 3.5.x
RUN echo '//> using dep "org.typelevel::cats-effect:3.5.7"' > /tmp/warmup/cats.scala && \
    echo 'import cats.effect._' >> /tmp/warmup/cats.scala && \
    echo 'object CatsWarmup { val x: IO[Int] = IO.pure(42) }' >> /tmp/warmup/cats.scala && \
    scala-cli compile --server=false /tmp/warmup/cats.scala && \
    echo "Cats Effect cached successfully"

# Clean up warmup files but keep the cache
RUN rm -rf /tmp/warmup

# Final stage: extend base image
FROM toolkata-sandbox-base:latest

# Switch to root for package installation
USER root

# Install JVM and POSIX utilities (required for scala-cli --jvm system detection)
# posix-libc-utils provides getconf and ldd which scala-cli needs to detect system JVM
# Remove su/sudo after install (apk may reinstall busybox symlinks)
RUN apk add --no-cache openjdk-21-jre posix-libc-utils && \
    rm -f /bin/su /usr/bin/su /sbin/su /usr/sbin/su 2>/dev/null || true

# Copy scala-cli from builder stage
COPY --from=builder /usr/local/bin/scala-cli /usr/local/bin/scala-cli

# Copy pre-cached dependencies from builder (coursier cache has all JARs)
COPY --from=builder /root/.cache/coursier /home/sandbox/.cache/coursier

# Create remaining cache directories and fix ownership
RUN mkdir -p /home/sandbox/.cache/bloop /home/sandbox/.ivy2/cache && \
    chown -R sandbox:sandbox /home/sandbox/.cache /home/sandbox/.ivy2 && \
    chmod -R u+w /home/sandbox/.cache /home/sandbox/.ivy2

# Verify installations
RUN scala-cli version

# Copy entrypoint script
COPY --chown=sandbox:sandbox entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Switch back to sandbox user for runtime
USER sandbox

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
