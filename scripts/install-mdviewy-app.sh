#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_APP="$ROOT_DIR/target/release/bundle/macos/mdviewy.app"
# /Applications is where LaunchServices actually resolves `open -a mdviewy`,
# Finder double-click, and the default .md handler — installing to
# ~/Applications silently left the real app 2.5 weeks stale (verified
# 2026-07-05: /Applications had 0.90.2 while target/ had 0.90.3 built weeks
# earlier). Override with DEST_DIR=... if you deliberately want a user-only install.
DEST_DIR="${DEST_DIR:-/Applications}"
DEST_APP="$DEST_DIR/mdviewy.app"
LSREGISTER="/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister"

if [[ ! -d "$SOURCE_APP" ]]; then
  echo "Missing app bundle: $SOURCE_APP"
  echo "Build it first with: yarn workspace @mdviewy/desktop build && yarn workspace @mdviewy/desktop tauri:build"
  exit 1
fi

mkdir -p "$DEST_DIR"
rm -rf "$DEST_APP"
ditto "$SOURCE_APP" "$DEST_APP"
xattr -cr "$DEST_APP" || true
codesign --force --deep --sign - --identifier com.supersynergy.mdviewy "$DEST_APP"
"$LSREGISTER" -f "$DEST_APP" || true

echo "Installed mdviewy.app to: $DEST_APP"
echo "Raycast should find it as: mdviewy"
