#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_APP="$ROOT_DIR/target/release/bundle/macos/mdmaster.app"
DEST_DIR="$HOME/Applications"
DEST_APP="$DEST_DIR/mdmaster.app"
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
codesign --force --deep --sign - --identifier com.supersynergy.mdmaster "$DEST_APP"
"$LSREGISTER" -f "$DEST_APP" || true

echo "Installed mdmaster.app to: $DEST_APP"
echo "Raycast should find it as: mdmaster"
