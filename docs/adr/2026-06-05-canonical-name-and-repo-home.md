# Canonical name casing and repository home

Date: 2026-06-05

Supersedes the casing/home details of `2026-05-26-rename-to-mdmaster.md` (whose
filename is misleading — its body already decided the name is `mdviewy`).

## Decision

- Canonical product name is **`mdviewy`**, all lowercase, everywhere user- or
  tooling-visible: `tauri.conf.json` `productName`, window title, `APP_NAME`,
  locale `app_name`, HTML `<title>`, in-app empty-state title, crate descriptions.
- Canonical public repository home is **GitHub**: `https://github.com/Supersynergy/mdviewy`.
  All package/manifest metadata points here (`package.json`, `Cargo.toml`,
  README badges and links).
- `git.marketdeck.io/Supersynergy/mdviewy` (Gitea, remote `gitea`) is a **dev
  mirror only**, kept for `scripts/gitea-push.sh`. Not referenced from
  user-facing metadata.
- The upstream fork source is `github.com/drl990114/MarkFlowy` (remote
  `upstream-markflowy`), retained for syncing.

## Why

- `origin` already points at GitHub; the README is written GitHub-first
  (shields.io stars, GitHub releases). One canonical home removes the
  package.json/Cargo (Gitea) vs README (GitHub) split-brain.
- Mixed casing (`MDviewy` vs `mdviewy`) looked unprofessional in the dock,
  taskbar, and store tiles. Lowercase matches the bundle identifier and CLI feel.

## Consequences

- Removed the inherited "reconstruction phase / 3-6 months / will not be
  released" notice from `README.md`, `README.src.md`, `README_CN.md`,
  `README_JA.md` — it contradicted shipping toward 1.0. Replaced with a Status
  section pointing at `docs/ROADMAP-1.0.md`.
- Future name/home changes must update this ADR, not add a third source of truth.
