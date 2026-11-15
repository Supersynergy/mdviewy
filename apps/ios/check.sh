#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
out="${MDVIEWY_BUILD_DIR:-$(mktemp -d)}"
mkdir -p "$out"
xcodebuild -project mdviewy.xcodeproj -target mdviewy -configuration Debug -sdk iphoneos \
  CONFIGURATION_BUILD_DIR="$out/device" OBJROOT="$out/obj" SYMROOT="$out/sym" \
  CODE_SIGNING_ALLOWED=NO -jobs 2 build >"$out/build.log" || { tail -60 "$out/build.log"; exit 1; }
bundle="$out/device/mdviewy.app"
test -x "$bundle/mdviewy"
test "$(plutil -extract UIDeviceFamily.0 raw "$bundle/Info.plist")" = 1
test "$(plutil -extract UIDeviceFamily.1 raw "$bundle/Info.plist")" = 2
swiftc -parse-as-library -swift-version 5 -Xfrontend -strict-concurrency=minimal Tests/ReaderSmoke.swift -o "$out/reader-smoke"
"$out/reader-smoke" "$bundle/reader.html"
echo "PASS iPhone and iPad device bundle: $bundle"
