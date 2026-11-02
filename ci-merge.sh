#!/usr/bin/env bash
# ci-merge.sh - rebuild the locally verified merged tree in CI:
#   web base (cyber-812/folia-major) + port-layer files (chuyiqi747/folia-ios) + overlay/
# Usage: ci-merge.sh <base_dir> <port_dir> <repo_root> <out_dir>
set -euo pipefail
BASE_DIR="$1"; PORT_DIR="$2"; REPO_ROOT="$3"; OUT_DIR="$4"
mkdir -p "$OUT_DIR"
cp -a "$BASE_DIR"/. "$OUT_DIR"/
rm -rf "$OUT_DIR/.git"
while IFS= read -r p; do
  [ -z "$p" ] && continue
  mkdir -p "$OUT_DIR/$(dirname "$p")"
  cp -a "$PORT_DIR/$p" "$OUT_DIR/$p"
done < "$REPO_ROOT/port-paths.txt"
cp -a "$REPO_ROOT/overlay"/. "$OUT_DIR"/
echo "merge done"
