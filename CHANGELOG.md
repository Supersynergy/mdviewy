# Changelog

## 0.90.2 - 2026-06-16

### Added

- Added Windows 11 release install guidance to README/docs, including the normal setup EXE, offline WebView2 installer, MSI use case, and SmartScreen note for unsigned prereleases.
- Added `.env.example` and `ATTRIBUTIONS.md` for release hygiene.
- Added a premium brand/logo + mascot concept set in `docs/brand/concepts-2026-06/` (3 abstract marks, 3 mascots — koala/tarsier/loris, and a recommended macOS app-icon tile), generated as self-contained SVGs plus `png/` previews. Recommended v1.0 direction: tarsier app icon + caret mark for small sizes.
- Added `docs/ROADMAP-1.0.md` — masterplan to 1.0 GA (6 phases: truth/naming, signing/distribution, security, tests, brand, release-eng) with per-phase gates and a critical path.
- Applied the new tarsier app icon across all `apps/desktop/src-tauri/icons/*` (png/icns/ico + Square/Store tiles) and `public/logo.png`.
- Added `docs/SIGNING.md` (Apple Developer ID + notarization and Windows Authenticode steps — the #1 GA blocker) and ADR `docs/adr/2026-06-05-security-posture-1.0.md` (CSP plan, assetProtocol rationale, audit policy).
- Added Rust edge tests for file-type detection (case-insensitive, dotfiles, suffix-not-substring) in `mdviewy-utils`.
- Wired lean + security gates into `justfile`: `just lean` (cargo-machete unused-dep scan), `just security` (gitleaks secret scan + osv-scanner lockfile vuln scan), `just ci` (= check), `just pre-pr` (check + lean + security). Added `.gitleaks.toml` (skips build/vendor trees; allowlists the public UpgradeLink download key).

### Security

- Cleared all fixable npm advisories: OSV **41 → 0 actionable** (35 vulnerabilities patched). Same-major via root `resolutions` (`postcss` 8.5.10, `prismjs` 1.30.0, `xml2js` 0.5.0, `react-router` 7.15.0, `@octokit/*`, `ip-address` 10, `js-cookie` 3, `json-bigint` 1, `tmp` 0.2.6, `undici` 6.24, `serialize-javascript` 7.0.5) plus major bumps (`uuid` 11, `tar` 7) and a direct `vitest` 3 → 4 upgrade — each verified with `yarn install` + desktop `vitest` (67/67) + `vite build`.
- Added `osv-scanner.toml` documenting the 6 remaining advisories that have **no released upstream fix** (`@ai-sdk/provider-utils` ReDoS; lodash/-es prototype-pollution/template — fix version unreleased, transitive/build-only), each with a reason and a 2026-09-06 review date. Scoped `just security`'s OSV scan to the npm lockfile (Rust advisories stay with `cargo audit`). `just security` now passes clean.

### Changed

- Reworked GitHub release automation for the mdviewy rename: removed the stale MarkFlowy artifact names, removed the disabled updater/UpgradeLink release tail, switched Actions to Node 24-compatible pins, and made offline Windows installer assets distinct.
- Aligned root/desktop license metadata with the AGPL root license and clarified public security reporting.
- Hardened release CI by avoiding a missing macOS `sccache` wrapper during Tauri builds and removing the stale contributor-list workflow that failed on GitHub token permissions.
- Trimmed 11 genuinely-unused Rust dependencies across 5 crates (verified by grep + `cargo check --all-features`): `mfdev` (anyhow/env_logger/log/os_pipe), `mdviewy-core` (serde_json/parking_lot/thiserror), `download_npm` (mdviewy-utils), `file_search` (dirs/toml), `mdviewy-utils` (regex). Added `cargo-machete` ignores for the two false-positives (`syntect` feature-gated, `log` macro-only) so `just lean` is clean.
- Removed the inherited "reconstruction phase / 3-6 months / will not be released" notice from `README.md`, `README.src.md`, `README_CN.md`, `README_JA.md`; replaced with a Status section linking the roadmap.
- Unified the product name to lowercase `mdviewy` everywhere user/tooling-visible (Tauri `productName`, window title, `APP_NAME`, locale `app_name`, HTML title, empty-state title, crate metadata).
- Pointed all package/manifest metadata at the canonical GitHub home (`package.json`, `Cargo.toml`); recorded the name + repo-home decision in ADR `docs/adr/2026-06-05-canonical-name-and-repo-home.md`.

### Fixed

- Made Table of Contents heading jumps deterministic after right-panel/menu switching by aligning against the active editor scroll container instead of mixing smooth fallbacks.
- Added inline hover actions for local paths and GitHub `owner/repo` mentions: open, open containing folder, copy path, open GitHub, copy URL, and copy Markdown link.
- Made the left inline path hover button resolve real directories via `is_dir` so folder references open as folders directly, with a folder icon and `Open folder` label.
- Converted shared toolbar icon controls from clickable glyphs into semantic buttons, improving CuaDriver, keyboard, and screen-reader automation.
- Added explicit Command Palette dialog, search, close, mode, and result semantics so automation no longer has to target static icon/text nodes.

### Verified

- `yarn workspace @mdviewy/desktop test`
- `yarn workspace @mdviewy/desktop build`
- CuaDriver AX smoke test against the Tauri dev app: unbounded AX snapshot returned 927 elements in under 1s, opened Search via `Open command palette`, verified `Command palette search` and `Close command palette`, then closed the overlay via AXPress.

## 0.90.1 - 2026-06-02

### Fixed

- Made the default release check use cached `cargo audit --no-fetch --stale` advisories to avoid crates.io yanked-registry timeout noise.
- Added a separate `just audit-online` recipe for deliberate live advisory refreshes.
- Replaced the unmaintained direct `dotenv` dependency with maintained `dotenvy`.
- Updated `tantivy` to reduce the RustSec warning surface in the direct FTS dependency chain.
- Fixed the CLI Cargo manifest author metadata key so Cargo no longer reports it as unused.
- Disabled RME's editor-internal hover chrome globally, including the left-side block handle and node labels such as `H1`, `H2`, and `H3`.
- Refreshed the Table of Contents when returning from the Smart Actions right-bar tab, so heading clicks keep targeting the active Markdown file.

### Verified

- `rust-modernize /Users/master/projects/mdviewy`
- `cargo check -p mdviewy-core --features fts`
- `just check` (12 nextest tests passed; cached `cargo audit` still reports 20 allowed transitive warnings)
- `rescope record --duration 180s --interval 1s --cmd-regex 'cargo|rustc|clippy|nextest|audit|mdviewy' --show-command --limit 15`
- `yarn workspace @mdviewy/desktop test`
- `yarn workspace @mdviewy/desktop build`
- `cargo check -p mdviewy`
- `yarn workspace @mdviewy/desktop tauri:build`
- Debugmaster / grepgod clean scan

## 0.90.0 - 2026-06-02

### Added

- Smart Actions panel and toolbar menu for path copying, Markdown/wiki/@-mention links, AI context packs, and Claude/Codex handoff prompts.
- Smart local path and URL detection for opening, revealing, and copying references from Markdown content.
- Focused regression tests for ToC refresh timing, hover chrome removal, updater removal, and startup chunk boundaries.

### Changed

- Bumped desktop, Tauri, and Cargo package versions to `0.90.0`.
- Limited Smart Actions reference extraction to stop early on large Markdown files.
- Kept the updater disabled so it cannot call the removed endpoint automatically.

### Fixed

- Stabilized Table of Contents extraction when switching active Markdown files.
- Removed stale hover actions from selected file tree rows.
- Removed remaining updater entry points from settings, scripts, Tauri config, and Rust setup.

## Older Releases

See [apps/desktop/UPDATE_LOG.md](apps/desktop/UPDATE_LOG.md).
