#!/usr/bin/env bash
# Push to git.marketdeck.io/Supersynergy/mdviewy
# Token from macOS keychain (account=Supersynergy, service=git.marketdeck.io).
# Repo MUST exist (token lacks write:user scope).
set -euo pipefail
HOST=git.marketdeck.io
OWNER=Supersynergy
REPO=mdviewy
T=$(security find-internet-password -s "$HOST" -a "$OWNER" -w)
[ -n "$T" ] || { echo "no token in keychain"; exit 1; }

code=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: token $T" \
  "https://$HOST/api/v1/repos/$OWNER/$REPO")
if [ "$code" != "200" ]; then
  echo "Repo $OWNER/$REPO not found (HTTP $code)."
  echo "Create once at: https://$HOST/repo/create  (private, default-branch main)"
  exit 2
fi

cd "$(dirname "$0")/.."
git remote remove gitea 2>/dev/null || true
git remote add gitea "https://$OWNER:$T@$HOST/$OWNER/$REPO.git"
git branch -M main 2>/dev/null || true
git push -u gitea main
git remote set-url gitea "https://$HOST/$OWNER/$REPO.git"
echo "pushed → https://$HOST/$OWNER/$REPO"
