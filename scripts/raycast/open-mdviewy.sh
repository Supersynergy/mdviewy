#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title mdmaster
# @raycast.mode silent

# Optional parameters:
# @raycast.icon /Users/master/Applications/mdmaster.app/Contents/Resources/icon.icns
# @raycast.packageName mdmaster
# @raycast.description Open the local native mdmaster macOS app.

set -euo pipefail

PROJECT_APP="/Users/master/projects/mdmaster/target/release/bundle/macos/mdmaster.app"
INSTALLED_APP="$HOME/Applications/mdmaster.app"

activate_or_launch() {
  local app_path="$1"
  local exe_path="$app_path/Contents/MacOS/mdmaster"

  if pgrep -fx "$exe_path" >/dev/null; then
    osascript -e 'tell application id "com.supersynergy.mdmaster" to activate' >/dev/null 2>&1 || true
    return 0
  fi

  cd "$(dirname "$exe_path")"
  nohup "$exe_path" >/tmp/mdmaster-raycast.log 2>&1 &
}

if [[ -x "$INSTALLED_APP/Contents/MacOS/mdmaster" ]]; then
  activate_or_launch "$INSTALLED_APP"
elif [[ -x "$PROJECT_APP/Contents/MacOS/mdmaster" ]]; then
  activate_or_launch "$PROJECT_APP"
else
  echo "mdmaster.app not found. Build it with: yarn workspace @mdmaster/desktop tauri:build"
  exit 1
fi
