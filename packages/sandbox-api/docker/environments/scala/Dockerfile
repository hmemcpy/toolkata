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

# Pre-cache dependencies using --server=false (no Bloop)
RUN mkdir -p /tmp/warmup

# Pre-cache ZIO core + streams + stm
RUN echo '//> using dep "dev.zio::zio:2.1.14"' > /tmp/warmup/zio.scala && \
    echo '//> using dep "dev.zio::zio-streams:2.1.14"' >> /tmp/warmup/zio.scala && \
    echo 'import zio._; import zio.stm._; import zio.stream._' >> /tmp/warmup/zio.scala && \
    echo 'object ZioWarmup { val x: UIO[Int] = ZIO.succeed(42) }' >> /tmp/warmup/zio.scala && \
    scala-cli compile --server=false /tmp/warmup/zio.scala && \
    echo "ZIO + streams + stm cached successfully"

# Pre-cache Cats Effect + fs2
RUN echo '//> using dep "org.typelevel::cats-effect:3.5.7"' > /tmp/warmup/cats.scala && \
    echo '//> using dep "co.fs2::fs2-core:3.11.0"' >> /tmp/warmup/cats.scala && \
    echo 'import cats.effect._; import fs2._' >> /tmp/warmup/cats.scala && \
    echo 'object CatsWarmup { val x: IO[Int] = IO.pure(42) }' >> /tmp/warmup/cats.scala && \
    scala-cli compile --server=false /tmp/warmup/cats.scala && \
    echo "Cats Effect + fs2 cached successfully"

# NOTE: cats-stm (coop) is not available for Scala 3.x stable
# Step 11 snippets using coop remain marked as validate={false}

# Pre-cache ZIO HTTP
RUN echo '//> using dep "dev.zio::zio-http:3.0.1"' > /tmp/warmup/ziohttp.scala && \
    echo 'import zio.http._' >> /tmp/warmup/ziohttp.scala && \
    echo 'object ZioHttpWarmup { val x = 1 }' >> /tmp/warmup/ziohttp.scala && \
    scala-cli compile --server=false /tmp/warmup/ziohttp.scala && \
    echo "ZIO HTTP cached successfully"

# Pre-cache http4s (ember server/client + circe)
RUN echo '//> using dep "org.http4s::http4s-dsl:0.23.30"' > /tmp/warmup/http4s.scala && \
    echo '//> using dep "org.http4s::http4s-ember-server:0.23.30"' >> /tmp/warmup/http4s.scala && \
    echo '//> using dep "org.http4s::http4s-ember-client:0.23.30"' >> /tmp/warmup/http4s.scala && \
    echo '//> using dep "org.http4s::http4s-circe:0.23.30"' >> /tmp/warmup/http4s.scala && \
    echo 'import org.http4s._' >> /tmp/warmup/http4s.scala && \
    echo 'object Http4sWarmup { val x = 1 }' >> /tmp/warmup/http4s.scala && \
    scala-cli compile --server=false /tmp/warmup/http4s.scala && \
    echo "http4s cached successfully"

# Pre-cache ZIO JSON
RUN echo '//> using dep "dev.zio::zio-json:0.7.3"' > /tmp/warmup/ziojson.scala && \
    echo 'import zio.json._' >> /tmp/warmup/ziojson.scala && \
    echo 'object ZioJsonWarmup { val x = 1 }' >> /tmp/warmup/ziojson.scala && \
    scala-cli compile --server=false /tmp/warmup/ziojson.scala && \
    echo "ZIO JSON cached successfully"

# Pre-cache Circe
RUN echo '//> using dep "io.circe::circe-generic:0.14.10"' > /tmp/warmup/circe.scala && \
    echo 'import io.circe._' >> /tmp/warmup/circe.scala && \
    echo 'object CirceWarmup { val x = 1 }' >> /tmp/warmup/circe.scala && \
    scala-cli compile --server=false /tmp/warmup/circe.scala && \
    echo "Circe cached successfully"

# Pre-cache ZIO JDBC
RUN echo '//> using dep "dev.zio::zio-jdbc:0.1.2"' > /tmp/warmup/ziojdbc.scala && \
    echo 'import zio.jdbc._' >> /tmp/warmup/ziojdbc.scala && \
    echo 'object ZioJdbcWarmup { val x = 1 }' >> /tmp/warmup/ziojdbc.scala && \
    scala-cli compile --server=false /tmp/warmup/ziojdbc.scala && \
    echo "ZIO JDBC cached successfully"

# Pre-cache Doobie
RUN echo '//> using dep "org.tpolecat::doobie-core:1.0.0-RC6"' > /tmp/warmup/doobie.scala && \
    echo 'import doobie._' >> /tmp/warmup/doobie.scala && \
    echo 'object DoobieWarmup { val x = 1 }' >> /tmp/warmup/doobie.scala && \
    scala-cli compile --server=false /tmp/warmup/doobie.scala && \
    echo "Doobie cached successfully"

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
