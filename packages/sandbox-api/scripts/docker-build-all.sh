#!/bin/bash
# Build all toolkata sandbox Docker images (base + environments)
#
# Usage:
#   ./scripts/docker-build-all.sh          # Build all and test
#   ./scripts/docker-build-all.sh --no-test # Build only
#
# Build order:
#   1. Base image (toolkata-sandbox-base:latest)
#   2. Environment images (toolkata-env:bash, node, python, scala)
#
# Exit codes:
#   0 - Success
#   1 - Build failed
#   2 - Tests failed

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$SCRIPT_DIR/../docker"
BASE_IMAGE_NAME="toolkata-sandbox-base"
ENV_IMAGE_NAME="toolkata-env"
IMAGE_TAG="${IMAGE_TAG:-latest}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Parse arguments
RUN_TESTS=true
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-test|--no-tests)
            RUN_TESTS=false
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Step 1: Build base image
log_step "Building base image: $BASE_IMAGE_NAME:$IMAGE_TAG"
docker build -t "$BASE_IMAGE_NAME:$IMAGE_TAG" "$DOCKER_DIR/base"

if [ $? -ne 0 ]; then
    log_error "Base image build failed"
    exit 1
fi

BASE_SIZE=$(docker images "$BASE_IMAGE_NAME:$IMAGE_TAG" --format "{{.Size}}")
log_info "Base image size: $BASE_SIZE"

# Step 2: Build environment images
log_step "Building environment images..."

# Build bash environment image
log_info "Building bash environment image: $ENV_IMAGE_NAME:bash"
docker build -t "$ENV_IMAGE_NAME:bash" "$DOCKER_DIR/environments/bash"

if [ $? -ne 0 ]; then
    log_error "bash environment image build failed"
    exit 1
fi

BASH_SIZE=$(docker images "$ENV_IMAGE_NAME:bash" --format "{{.Size}}")
log_info "bash environment size: $BASH_SIZE"

# Build node environment image
log_info "Building node environment image: $ENV_IMAGE_NAME:node"
docker build -t "$ENV_IMAGE_NAME:node" "$DOCKER_DIR/environments/node"

if [ $? -ne 0 ]; then
    log_error "node environment image build failed"
    exit 1
fi

NODE_SIZE=$(docker images "$ENV_IMAGE_NAME:node" --format "{{.Size}}")
log_info "node environment size: $NODE_SIZE"

# Build python environment image
log_info "Building python environment image: $ENV_IMAGE_NAME:python"
docker build -t "$ENV_IMAGE_NAME:python" "$DOCKER_DIR/environments/python"

if [ $? -ne 0 ]; then
    log_error "python environment image build failed"
    exit 1
fi

PYTHON_SIZE=$(docker images "$ENV_IMAGE_NAME:python" --format "{{.Size}}")
log_info "python environment size: $PYTHON_SIZE"

# Build scala environment image
log_info "Building scala environment image: $ENV_IMAGE_NAME:scala"
docker build -t "$ENV_IMAGE_NAME:scala" "$DOCKER_DIR/environments/scala"

if [ $? -ne 0 ]; then
    log_error "scala environment image build failed"
    exit 1
fi

SCALA_SIZE=$(docker images "$ENV_IMAGE_NAME:scala" --format "{{.Size}}")
log_info "scala environment size: $SCALA_SIZE"

# Build typescript environment image
log_info "Building typescript environment image: $ENV_IMAGE_NAME:typescript"
docker build -t "$ENV_IMAGE_NAME:typescript" "$DOCKER_DIR/environments/typescript"

if [ $? -ne 0 ]; then
    log_error "typescript environment image build failed"
    exit 1
fi

TYPESCRIPT_SIZE=$(docker images "$ENV_IMAGE_NAME:typescript" --format "{{.Size}}")
log_info "typescript environment size: $TYPESCRIPT_SIZE"

# Step 3: Run tests if enabled
if [ "$RUN_TESTS" = true ]; then
    log_step "Running tests..."

    # Test bash environment
    log_info "Testing bash environment..."

    # Test 1: Basic tools availability in bash
    log_info "  Test 1: Checking git and jj are installed..."
    docker run --rm "$ENV_IMAGE_NAME:bash" /bin/bash -c '
        set -e
        git --version > /dev/null
        jj --version > /dev/null
        echo "git and jj are available"
    '
    if [ $? -ne 0 ]; then
        log_error "Test 1 failed: git/jj not available in bash environment"
        exit 2
    fi

    # Test 2: Initialize repo and make commits in bash
    log_info "  Test 2: Testing jj git workflow in bash..."
    docker run --rm "$ENV_IMAGE_NAME:bash" /bin/bash -c '
        set -e

        # Initialize repo
        jj git init --colocate

        # Create a file and commit
        echo "Hello World" > README.md
        jj describe -m "Initial commit"

        # Verify commit exists
        jj log --limit 1 | grep -q "Initial commit"

        # Create another commit
        jj new
        echo "More content" > file.txt
        jj describe -m "Add file"

        # Verify both commits exist
        COMMIT_COUNT=$(jj log --no-pager | grep -c "^@\|^◆\|^○")
        if [ "$COMMIT_COUNT" -lt 2 ]; then
            echo "Expected at least 2 commits, got $COMMIT_COUNT"
            exit 1
        fi

        echo "jj workflow works correctly"
    '
    if [ $? -ne 0 ]; then
        log_error "Test 2 failed: jj workflow broken in bash environment"
        exit 2
    fi

    # Test 3: UTF-8 support in bash
    log_info "  Test 3: Testing UTF-8 support in bash..."
    docker run --rm "$ENV_IMAGE_NAME:bash" /bin/bash -c '
        set -e

        jj git init --colocate

        # Create files with UTF-8 content
        echo "Привет мир" > russian.txt
        echo "שלום עולם" > hebrew.txt
        echo "你好世界" > chinese.txt

        # Verify content is preserved
        grep -q "Привет" russian.txt
        grep -q "שלום" hebrew.txt
        grep -q "你好" chinese.txt

        # Commit with UTF-8 message
        jj describe -m "Тест UTF-8 测试"

        # Verify commit message
        jj log --limit 1 | grep -q "Тест"

        echo "UTF-8 support works correctly"
    '
    if [ $? -ne 0 ]; then
        log_error "Test 3 failed: UTF-8 support broken in bash environment"
        exit 2
    fi

    # Test 4: Verify no dangerous tools in bash
    log_info "  Test 4: Verifying security hardening in bash..."
    docker run --rm "$ENV_IMAGE_NAME:bash" /bin/bash -c '
        set -e

        # These should NOT exist
        DANGEROUS_TOOLS="curl wget sudo su apt apt-get dpkg"

        for tool in $DANGEROUS_TOOLS; do
            if command -v "$tool" &> /dev/null; then
                echo "FAIL: $tool should not be available"
                exit 1
            fi
        done

        echo "Security hardening verified"
    '
    if [ $? -ne 0 ]; then
        log_error "Test 4 failed: Dangerous tools found in bash environment"
        exit 2
    fi

    # Test 5: Verify user is non-root in bash
    log_info "  Test 5: Verifying non-root user in bash..."
    docker run --rm "$ENV_IMAGE_NAME:bash" /bin/bash -c '
        set -e

        CURRENT_USER=$(whoami)
        if [ "$CURRENT_USER" = "root" ]; then
            echo "FAIL: Running as root"
            exit 1
        fi

        echo "Running as non-root user: $CURRENT_USER"
    '
    if [ $? -ne 0 ]; then
        log_error "Test 5 failed: Running as root in bash environment"
        exit 2
    fi

    log_info "bash environment tests passed!"

    # Test node environment
    log_info "Testing node environment..."

    # Test 6: Node.js is available
    log_info "  Test 6: Checking Node.js is installed..."
    docker run --rm "$ENV_IMAGE_NAME:node" /bin/bash -c '
        set -e
        node --version > /dev/null
        npm --version > /dev/null
        echo "Node.js and npm are available"
    '
    if [ $? -ne 0 ]; then
        log_error "Test 6 failed: Node.js/npm not available in node environment"
        exit 2
    fi

    # Test 7: Node.js can run a simple script
    log_info "  Test 7: Testing Node.js can run scripts..."
    docker run --rm "$ENV_IMAGE_NAME:node" /bin/bash -c '
        set -e

        # Create a simple JS file
        cat > test.js << EOF
console.log("Hello from Node.js");
console.log("Node version:", process.version);
EOF

        # Run it
        OUTPUT=$(node test.js)
        echo "$OUTPUT" | grep -q "Hello from Node.js"

        echo "Node.js script execution works"
    '
    if [ $? -ne 0 ]; then
        log_error "Test 7 failed: Node.js script execution broken"
        exit 2
    fi

    # Test 8: npm can install packages
    log_info "  Test 8: Testing npm install..."
    docker run --rm "$ENV_IMAGE_NAME:node" /bin/bash -c '
        set -e

        # Create a simple package.json
        cat > package.json << EOF
{
  "name": "test",
  "version": "1.0.0"
}
EOF

        # Try to install a small package (non-interactively)
        npm install --silent --no-audit --no-fund typescript@5.7.3 2>/dev/null || npm install typescript@5.7.3

        # Verify it was installed
        [ -d node_modules/typescript ]

        echo "npm install works"
    '
    if [ $? -ne 0 ]; then
        log_error "Test 8 failed: npm install broken"
        exit 2
    fi

    log_info "node environment tests passed!"

    # Test python environment
    log_info "Testing python environment..."

    # Test 9: Python is available
    log_info "  Test 9: Checking Python is installed..."
    docker run --rm "$ENV_IMAGE_NAME:python" /bin/bash -c '
        set -e
        python3 --version > /dev/null
        pip3 --version > /dev/null
        echo "Python and pip are available"
    '
    if [ $? -ne 0 ]; then
        log_error "Test 9 failed: Python/pip not available in python environment"
        exit 2
    fi

    # Test 10: Python can run a simple script
    log_info "  Test 10: Testing Python can run scripts..."
    docker run --rm "$ENV_IMAGE_NAME:python" /bin/bash -c '
        set -e

        # Create a simple Python file
        cat > test.py << EOF
print("Hello from Python")
import sys
print(f"Python version: {sys.version_info.major}.{sys.version_info.minor}")
EOF

        # Run it
        OUTPUT=$(python3 test.py)
        echo "$OUTPUT" | grep -q "Hello from Python"

        echo "Python script execution works"
    '
    if [ $? -ne 0 ]; then
        log_error "Test 10 failed: Python script execution broken"
        exit 2
    fi

    # Test 11: pip can install packages
    log_info "  Test 11: Testing pip install..."
    docker run --rm "$ENV_IMAGE_NAME:python" /bin/bash -c '
        set -e

        # Install a small package
        pip3 install --quiet --no-input typer 2>/dev/null || pip3 install typer

        # Verify it was installed
        python3 -c "import typer; print(\"typer imported successfully\")"

        echo "pip install works"
    '
    if [ $? -ne 0 ]; then
        log_error "Test 11 failed: pip install broken"
        exit 2
    fi

    log_info "python environment tests passed!"

    # Test scala environment
    log_info "Testing scala environment..."

    # Test 12: scala-cli is available
    log_info "  Test 12: Checking scala-cli is installed..."
    docker run --rm "$ENV_IMAGE_NAME:scala" /bin/bash -c '
        set -e
        scala-cli version > /dev/null
        echo "scala-cli is available"
    '
    if [ $? -ne 0 ]; then
        log_error "Test 12 failed: scala-cli not available in scala environment"
        exit 2
    fi

    # Test 13: Scala can compile a simple snippet
    log_info "  Test 13: Testing Scala can compile snippets..."
    docker run --rm "$ENV_IMAGE_NAME:scala" /bin/bash -c "
        set -e

        # Create a simple Scala file with @main function (required for Scala 3 top-level statements)
        echo '//> using scala 3.5.0

@main def run(): Unit =
  val x = 42
  println(s\"Hello from Scala: \$x\")' > test.scala

        # Compile and run it with --server=false to avoid Bloop
        OUTPUT=\$(scala-cli run --server=false test.scala)
        echo \"\$OUTPUT\" | grep -q \"Hello from Scala: 42\"

        echo \"Scala compilation and execution works\"
    "
    if [ $? -ne 0 ]; then
        log_error "Test 13 failed: Scala compilation broken"
        exit 2
    fi

    # Test 14: ZIO is pre-cached and available
    log_info "  Test 14: Testing ZIO library is available..."
    docker run --rm "$ENV_IMAGE_NAME:scala" /bin/bash -c '
        set -e

        cat > test-zio.scala << EOF
//> using dep dev.zio::zio::2.1.14

import zio._

val program: ZIO[Any, Nothing, Unit] =
  Console.printLine("Hello from ZIO")

override def run = program
EOF

        scala-cli run --server=false test-zio.scala 2>&1 | grep -q "Hello from ZIO"

        echo "ZIO library works"
    '
    if [ $? -ne 0 ]; then
        log_error "Test 14 failed: ZIO library not available"
        exit 2
    fi

    # Test 15: Cats Effect is available
    log_info "  Test 15: Testing Cats Effect library is available..."
    docker run --rm "$ENV_IMAGE_NAME:scala" /bin/bash -c "
        set -e

        # Create a Cats Effect IOApp file (Scala 3 syntax)
        echo '//> using dep org.typelevel::cats-effect::3.5.7

import cats.effect._

object Main extends IOApp.Simple:
  def run: IO[Unit] = IO.println(\"Hello from Cats Effect\")' > test-ce.scala

        # Run with --server=false to avoid Bloop
        OUTPUT=\$(scala-cli run --server=false test-ce.scala 2>&1)
        echo \"\$OUTPUT\" | grep -q \"Hello from Cats Effect\"

        echo \"Cats Effect library works\"
    "
    if [ $? -ne 0 ]; then
        log_error "Test 15 failed: Cats Effect library not available"
        exit 2
    fi

    # Test 16: Verify user is non-root in scala
    log_info "  Test 16: Verifying non-root user in scala..."
    docker run --rm "$ENV_IMAGE_NAME:scala" /bin/bash -c '
        set -e

        CURRENT_USER=$(whoami)
        if [ "$CURRENT_USER" = "root" ]; then
            echo "FAIL: Running as root"
            exit 1
        fi

        echo "Running as non-root user: $CURRENT_USER"
    '
    if [ $? -ne 0 ]; then
        log_error "Test 16 failed: Running as root in scala environment"
        exit 2
    fi

    log_info "scala environment tests passed!"

    # Test typescript environment
    log_info "Testing typescript environment..."

    # Test 17: Node.js, tsx, tsc are available
    log_info "  Test 17: Checking Node.js, tsx, tsc are installed..."
    docker run --rm "$ENV_IMAGE_NAME:typescript" /bin/bash -c '
        set -e
        node --version > /dev/null
        npm --version > /dev/null
        tsx --version > /dev/null
        tsc --version > /dev/null
        echo "Node.js, npm, tsx, tsc are available"
    '
    if [ $? -ne 0 ]; then
        log_error "Test 17 failed: Node.js/npm/tsx/tsc not available in typescript environment"
        exit 2
    fi

    # Test 18: TypeScript can compile a simple snippet
    log_info "  Test 18: Testing TypeScript can compile snippets..."
    docker run --rm "$ENV_IMAGE_NAME:typescript" /bin/bash -c '
        set -e

        # Create a simple TypeScript file
        cat > test.ts << EOF
const x: number = 42
console.log("Hello from TypeScript")
EOF

        # Compile it with tsc (noEmit)
        tsc --noEmit test.ts

        echo "TypeScript compilation works"
    '
    if [ $? -ne 0 ]; then
        log_error "Test 18 failed: TypeScript compilation broken"
        exit 2
    fi

    # Test 19: Effect package is available
    log_info "  Test 19: Testing Effect package is available..."
    docker run --rm "$ENV_IMAGE_NAME:typescript" /bin/bash -c '
        set -e

        # Create a TypeScript file using Effect
        # Use Effect.tap to print the value
        cat > test-effect.ts << EOF
import { Effect, Console } from "effect"

const program = Effect.succeed("Hello from Effect").pipe(
  Effect.tap((msg) => Console.log(msg))
)

Effect.runPromise(program)
EOF

        # Run it with tsx
        OUTPUT=$(tsx test-effect.ts)
        echo "$OUTPUT" | grep -q "Hello from Effect"

        echo "Effect package works"
    '
    if [ $? -ne 0 ]; then
        log_error "Test 19 failed: Effect package not available"
        exit 2
    fi

    # Test 20: Verify user is non-root in typescript
    log_info "  Test 20: Verifying non-root user in typescript..."
    docker run --rm "$ENV_IMAGE_NAME:typescript" /bin/bash -c '
        set -e

        CURRENT_USER=$(whoami)
        if [ "$CURRENT_USER" = "root" ]; then
            echo "FAIL: Running as root"
            exit 1
        fi

        echo "Running as non-root user: $CURRENT_USER"
    '
    if [ $? -ne 0 ]; then
        log_error "Test 20 failed: Running as root in typescript environment"
        exit 2
    fi

    log_info "typescript environment tests passed!"

    log_info "All environment tests passed!"
fi

log_step "Summary"
log_info "Base image:     $BASE_IMAGE_NAME:$IMAGE_TAG ($BASE_SIZE)"
log_info "bash env:       $ENV_IMAGE_NAME:bash ($BASH_SIZE)"
log_info "node env:       $ENV_IMAGE_NAME:node ($NODE_SIZE)"
log_info "python env:     $ENV_IMAGE_NAME:python ($PYTHON_SIZE)"
log_info "scala env:      $ENV_IMAGE_NAME:scala ($SCALA_SIZE)"
log_info "typescript env: $ENV_IMAGE_NAME:typescript ($TYPESCRIPT_SIZE)"
log_info "Done. All images ready."
