#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title mdviewy
# @raycast.mode silent

# Optional parameters:
# @raycast.icon /Applications/mdviewy.app/Contents/Resources/icon.icns
# @raycast.packageName mdviewy
# @raycast.description Open the local native mdviewy macOS app.

set -euo pipefail

PROJECT_APP="/Users/master/projects/mdviewy/target/release/bundle/macos/mdviewy.app"
INSTALLED_APP="/Applications/mdviewy.app"

activate_or_launch() {
  local app_path="$1"
  local exe_path="$app_path/Contents/MacOS/mdviewy"

  if pgrep -fx "$exe_path" >/dev/null; then
    osascript -e 'tell application id "com.supersynergy.mdviewy" to activate' >/dev/null 2>&1 || true
    return 0
  fi

  cd "$(dirname "$exe_path")"
  nohup "$exe_path" >/tmp/mdviewy-raycast.log 2>&1 &
}

if [[ -x "$INSTALLED_APP/Contents/MacOS/mdviewy" ]]; then
  activate_or_launch "$INSTALLED_APP"
elif [[ -x "$PROJECT_APP/Contents/MacOS/mdviewy" ]]; then
  activate_or_launch "$PROJECT_APP"
else
  echo "mdviewy.app not found. Build it with: yarn workspace @mdviewy/desktop tauri:build"
  exit 1
fi
