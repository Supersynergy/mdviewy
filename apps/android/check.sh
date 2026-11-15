#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
: "${ANDROID_SERIAL:?Select a fresh disposable English-language emulator}"
out="${MDVIEWY_ANDROID_BUILD:-$(mktemp -d)}"
mkdir -p "$out"
"${GRADLE:-gradle}" assembleDebug --offline --max-workers=2 --project-cache-dir "$out/cache" "-PverificationBuildDir=$out/build"
apk=$(find "$out/build"/outputs/apk/debug -name '*.apk' -print -quit)
adb -s "$ANDROID_SERIAL" install -r "$apk"
python3 tests/document_flow.py
