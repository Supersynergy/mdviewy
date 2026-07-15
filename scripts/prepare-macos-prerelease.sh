#!/usr/bin/env bash

set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This script must run on macOS."
  exit 1
fi

BUNDLE_ROOT="${1:?usage: prepare-macos-prerelease.sh <bundle-root>}"
APP_PATH="$BUNDLE_ROOT/macos/mdviewy.app"
DMG_DIR="$BUNDLE_ROOT/dmg"
DMG_SCRIPT="$DMG_DIR/bundle_dmg.sh"

if [[ ! -d "$APP_PATH" ]]; then
  echo "Missing app bundle: $APP_PATH"
  exit 1
fi

if [[ ! -x "$DMG_SCRIPT" ]]; then
  echo "Missing DMG builder: $DMG_SCRIPT"
  exit 1
fi

shopt -s nullglob
dmgs=("$DMG_DIR"/*.dmg)
if [[ "${#dmgs[@]}" -ne 1 ]]; then
  echo "Expected exactly one DMG in $DMG_DIR, found ${#dmgs[@]}"
  exit 1
fi

DMG_PATH="${dmgs[0]}"
WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/mdviewy-macos-release.XXXXXX")"
STAGING_DIR="$WORK_DIR/staging"
MOUNT_DIR="$WORK_DIR/mount"
REBUILT_DMG="$WORK_DIR/$(basename "$DMG_PATH")"
MOUNTED=0

cleanup() {
  if [[ "$MOUNTED" -eq 1 ]]; then
    hdiutil detach "$MOUNT_DIR" >/dev/null 2>&1 || true
  fi
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

mkdir -p "$STAGING_DIR" "$MOUNT_DIR"

# Tauri leaves an unsigned bundle around a linker-ad-hoc-signed executable
# when no Developer ID certificate is configured. Sign the complete bundle so
# macOS gets a valid CodeResources seal. This is still an honest, unnotarized
# prerelease signature; a future Developer ID release must replace this lane.
codesign \
  --force \
  --deep \
  --sign - \
  --identifier com.supersynergy.mdviewy \
  "$APP_PATH"
codesign --verify --deep --strict --verbose=2 "$APP_PATH"

ditto "$APP_PATH" "$STAGING_DIR/mdviewy.app"

# Rebuild the image after signing; modifying only the app outside the existing
# DMG would leave the downloadable artifact with the original invalid bundle.
bash "$DMG_SCRIPT" \
  --volname mdviewy \
  --icon mdviewy.app 160 185 \
  --app-drop-link 480 185 \
  --window-size 640 400 \
  "$REBUILT_DMG" \
  "$STAGING_DIR"

hdiutil attach \
  -nobrowse \
  -readonly \
  -mountpoint "$MOUNT_DIR" \
  "$REBUILT_DMG" >/dev/null
MOUNTED=1

codesign --verify --deep --strict --verbose=2 "$MOUNT_DIR/mdviewy.app"

bundle_id="$(plutil -extract CFBundleIdentifier raw "$MOUNT_DIR/mdviewy.app/Contents/Info.plist")"
if [[ "$bundle_id" != "com.supersynergy.mdviewy" ]]; then
  echo "Unexpected bundle identifier: $bundle_id"
  exit 1
fi

hdiutil detach "$MOUNT_DIR" >/dev/null
MOUNTED=0
mv -f "$REBUILT_DMG" "$DMG_PATH"

echo "Verified ad-hoc-signed macOS prerelease: $DMG_PATH"
