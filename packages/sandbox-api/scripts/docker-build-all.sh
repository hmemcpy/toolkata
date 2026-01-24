#!/bin/bash
# Build all toolkata sandbox Docker images (base + tool-pairs)
#
# Usage:
#   ./scripts/docker-build-all.sh          # Build all and test
#   ./scripts/docker-build-all.sh --no-test # Build only
#
# Build order:
#   1. Base image (toolkata-sandbox-base:latest)
#   2. Tool-pair images (toolkata-sandbox:jj-git, etc.)
#
# Exit codes:
#   0 - Success
#   1 - Build failed
#   2 - Tests failed

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$SCRIPT_DIR/../docker"
BASE_IMAGE_NAME="toolkata-sandbox-base"
IMAGE_NAME="toolkata-sandbox"
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

# Step 2: Build tool-pair images
log_step "Building tool-pair images..."

# Build jj-git tool-pair image
log_info "Building jj-git tool-pair image: $IMAGE_NAME:jj-git"
docker build -t "$IMAGE_NAME:jj-git" "$DOCKER_DIR/tool-pairs/jj-git"

if [ $? -ne 0 ]; then
    log_error "jj-git image build failed"
    exit 1
fi

JJ_GIT_SIZE=$(docker images "$IMAGE_NAME:jj-git" --format "{{.Size}}")
log_info "jj-git image size: $JJ_GIT_SIZE"

# Tag jj-git as latest for backward compatibility
docker tag "$IMAGE_NAME:jj-git" "$IMAGE_NAME:latest"
log_info "Tagged $IMAGE_NAME:jj-git as $IMAGE_NAME:latest for backward compatibility"

# Step 3: Run tests if enabled
if [ "$RUN_TESTS" = true ]; then
    log_step "Running tests on jj-git image..."

    # Test 1: Basic tools availability
    log_info "Test 1: Checking git and jj are installed..."
    docker run --rm "$IMAGE_NAME:jj-git" /bin/bash -c '
        set -e
        git --version > /dev/null
        jj --version > /dev/null
        echo "git and jj are available"
    '
    if [ $? -ne 0 ]; then
        log_error "Test 1 failed: git/jj not available"
        exit 2
    fi

    # Test 2: Initialize repo and make commits
    log_info "Test 2: Testing jj git workflow..."
    docker run --rm "$IMAGE_NAME:jj-git" /bin/bash -c '
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
        log_error "Test 2 failed: jj workflow broken"
        exit 2
    fi

    # Test 3: UTF-8 support
    log_info "Test 3: Testing UTF-8 support..."
    docker run --rm "$IMAGE_NAME:jj-git" /bin/bash -c '
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
        log_error "Test 3 failed: UTF-8 support broken"
        exit 2
    fi

    # Test 4: Verify no dangerous tools
    log_info "Test 4: Verifying security hardening..."
    docker run --rm "$IMAGE_NAME:jj-git" /bin/bash -c '
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
        log_error "Test 4 failed: Dangerous tools found"
        exit 2
    fi

    # Test 5: Verify user is non-root
    log_info "Test 5: Verifying non-root user..."
    docker run --rm "$IMAGE_NAME:jj-git" /bin/bash -c '
        set -e

        CURRENT_USER=$(whoami)
        if [ "$CURRENT_USER" = "root" ]; then
            echo "FAIL: Running as root"
            exit 1
        fi

        echo "Running as non-root user: $CURRENT_USER"
    '
    if [ $? -ne 0 ]; then
        log_error "Test 5 failed: Running as root"
        exit 2
    fi

    log_info "All tests passed!"
fi

log_step "Summary"
log_info "Base image:      $BASE_IMAGE_NAME:$IMAGE_TAG ($BASE_SIZE)"
log_info "jj-git image:    $IMAGE_NAME:jj-git ($JJ_GIT_SIZE)"
log_info "jj-git (latest): $IMAGE_NAME:latest (tagged for compatibility)"
log_info "Done. All images ready."
