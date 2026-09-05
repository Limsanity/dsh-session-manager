#!/usr/bin/env bash
# link-dev-deps.sh — make a locally-`link:`-installed dsh plugin resolve the DSH
# host's `@deepseek-ai` packages (and to keep module identity aligned with the host)
# without committing any per-machine absolute path.
#
# Why this exists
# --------------
# A plugin that is installed via `dsh plugin --profile web add <dir>` becomes a
# SYMLINK in the profile's node_modules. When DSH loads it, Node follows the link
# to the plugin's real directory and its bare `import '@deepseek-ai/...'` resolve
# from there — a parent-directory walk that NEVER passes through
# `$DSH_HOME/profiles/node_modules`. So the plugin cannot see the host's
# @deepseek-ai packages that DSH normally provides (via that flat fallback dir).
#
# The DSH host keeps all `@deepseek-ai` packages under `$DSH_HOME/profiles/node_modules`
# (one symlink per package in the host's closure). This script re-exposes that set
# inside the plugin's own `node_modules/@deepseek-ai` so both the build (tsdown/tsc)
# and the runtime loader can resolve them against the HOST copies.
#
# Portable: every path here is derived from `$DSH_HOME` (default `~/.dsh`), never
# from a fixed per-machine location. Run AFTER `pnpm install` in the plugin dir
# (pnpm owns/manages node_modules and will prune manually-added links).
#
# Usage:
#   ./scripts/link-dev-deps.sh
set -euo pipefail

DSH_HOME="${DSH_HOME:-$HOME/.dsh}"
FALLBACK="$DSH_HOME/profiles/node_modules"

# The plugin's own node_modules (this script sits in <plugin>/scripts).
PLUGIN_DIR="$(cd "$(dirname "$0")/.." && pwd)"
NM="$PLUGIN_DIR/node_modules"

if [ ! -d "$FALLBACK" ]; then
  echo "link-dev-deps: fallback dir not found: $FALLBACK" >&2
  echo "  -> run 'dsh web' (or any dsh command) first so DSH seeds it." >&2
  exit 1
fi

TARGET="$NM/@deepseek-ai"
mkdir -p "$TARGET"

# Copy-link every @deepseek-ai package the host provides into the plugin's own
# @deepseek-ai dir. Host-service packages must use the HOST copies so module
# identity matches the running DSH (registry peer copies install a different
# version). We force-OVERWRITE any existing entry for those, but never touch
# the client-ui packages pnpm installed from the registry (build-type-only,
# provided at runtime by the web shell) — those are not in the host fallback,
# so this loop naturally leaves them alone.
count=0
for pkg in "$FALLBACK/@deepseek-ai"/*; do
  [ -e "$pkg" ] || continue
  name="$(basename "$pkg")"
  rm -rf "$TARGET/$name"
  ln -s "$pkg" "$TARGET/$name"
  count=$((count + 1))
done

echo "link-dev-deps: linked $count @deepseek-ai host packages into $TARGET"
ls "$TARGET" | wc -l | awk '{print "link-dev-deps: total @deepseek-ai entries now:", $1}'

# Non-@deepseek-ai host packages the plugin imports that must also stay on the
# HOST copy for type/runtime identity (e.g. `zod` — the plugin builds a zod
# schema that the host's dsh-storage-domain service reads, so both must share
# the same zod type). Symlink each over any registry copy pnpm installed.
for name in zod js-yaml; do
  if [ -e "$FALLBACK/$name" ]; then
    rm -rf "$NM/$name"
    ln -s "$FALLBACK/$name" "$NM/$name"
  fi
done
echo "link-dev-deps: linked host '$FALLBACK' zod/js-yaml into $NM"
