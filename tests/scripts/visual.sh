#!/usr/bin/env bash
# Runs the visual suite in the pinned Playwright image. `test` compares;
# `update` rewrites differing or missing baselines; extra args go to playwright.
# Fresh container, repo copied in read-only.
#
# Baselines are made on linux/amd64, where CI compares them pixel-exact. On a
# dev machine, `test` runs the image for the host's architecture (natively, so
# fast) and allows a small difference; `update` stays on linux/amd64, one test
# at a time, since emulated parallel runs crash.
set -euo pipefail

# Keep in sync with EXPECTED_IMAGE in playwright.visual.config.ts.
IMAGE="mcr.microsoft.com/playwright:v1.60.0-noble"

mode="${1:-test}"
shift || true
case "$mode" in
  test) update="none" ;;
  update) update="changed" ;;
  *)
    echo "usage: $0 test|update [playwright args]" >&2
    exit 2
    ;;
esac

platform="linux/amd64"
tolerant=""
workers=()
if [[ -z "${CI:-}" ]]; then
  if [[ "$mode" == "update" ]]; then
    workers=(--workers=1)
  else
    case "$(uname -m)" in
      arm64 | aarch64) platform="linux/arm64" ;;
    esac
    tolerant="1"
  fi
fi

repo="$(cd "$(dirname "$0")/../.." && pwd)"
screenshots="$repo/tests/visual/__screenshots__"
results="$repo/tests/visual-results"
mkdir -p "$screenshots"
rm -rf "$results"
mkdir -p "$results"

# One pnpm cache per platform to keep x86-64 and arm64 binaries separate
docker run --rm --init --ipc=host --platform "$platform" \
  -v "$repo:/src:ro" \
  -v "$screenshots:/work/tests/visual/__screenshots__" \
  -v "$results:/work/tests/visual-results" \
  -v "stacks-visual-pnpm-cache-${platform//\//-}:/root/.cache/pnpm" \
  -e COREPACK_HOME=/root/.cache/pnpm/corepack \
  -e pnpm_config_store_dir=/root/.cache/pnpm/store \
  -e CI="${CI:-}" \
  -e VISUAL_TOLERANT="$tolerant" \
  -e HOST_UID="$(id -u)" \
  -e HOST_GID="$(id -g)" \
  -w /work \
  "$IMAGE" \
  bash -euo pipefail -c '
    # Hand the written files back to the host user (matters on Linux hosts).
    trap "chown -R \$HOST_UID:\$HOST_GID /work/tests/visual/__screenshots__ /work/tests/visual-results" EXIT

    tar -C /src -cf - \
      --exclude=node_modules \
      --exclude=".env*" \
      --exclude=./.git \
      --exclude=./frontend/build \
      --exclude=./frontend/.react-router \
      --exclude=./tests/visual/__screenshots__ \
      --exclude=./tests/visual-results \
      . | tar -C /work -xf -

    # Corepack provides the pnpm version pinned in package.json.
    corepack enable pnpm
    # CI=1 skips the frontend prepare script (lefthook needs .git).
    CI=1 COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm install --frozen-lockfile --reporter=append-only
    # The frontend is built by the webServer in playwright.visual.config.ts.

    cd tests
    pnpm exec playwright test -c playwright.visual.config.ts --update-snapshots="$0" "$@"
  ' "$update" ${workers[@]+"${workers[@]}"} "$@"
