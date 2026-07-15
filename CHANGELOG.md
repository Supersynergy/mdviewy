# Changelog

## 0.92.0 - 2026-07-15

### Fixed

- Removed the startup folder suggestions that recursively opened large home, Claude, and Codex trees. Workspace scans are now bounded by entry count and depth, and failures reject visibly instead of leaving a pending promise.
- Removed unsafe startup/new-window debug scripts that broke WebView initialization when a path contained an apostrophe, and added a queued browser-event fallback so Finder/CLI file opens survive missed native listener timing.
- Added a top-level recovery boundary with Reload and Safe start actions so render failures no longer end in an unrecoverable white screen.
- File writes now use a durable same-directory temporary file and atomic replacement. Dirty state clears only after the native write succeeds.
- External single-file opens now enter focus mode and collapse stale left/right panel widths. This removes the blank sidebar area that survived earlier overflow-only whitespace fixes.
- Replaced the fixed 980px editor column with configurable adaptive, focused, wide, and full-width modes; existing legacy full-width users keep their choice.

### Added

- Added a dedicated GitHub-style README preview with sanitized HTML, GFM tables/tasks/alerts, heading anchors, relative local assets, safe in-app Markdown links, and browser-routed web links.
- README files now default to Preview. GitHub-only constructs that cannot survive the visual editor round trip fail closed into Source mode.
- Added `Print / Save as PDF` to every editor action menu. Print CSS isolates the active document from application chrome and preserves page-break styling.
- Smart Actions now surface frontmatter titles/tags and can copy a deterministic document brief with file metadata, word count, and a bounded heading outline.
- Added `app_reset_layout` to the command palette for one-step recovery from stale persisted panel sizes.

### Changed

- Replaced the generated multilingual README set with one canonical, outcome-first project page, current screenshot, honest signing status, and a verified feature matrix.
- Consolidated GitHub automation into one least-privilege CI workflow and one release workflow with immutable action pins; refreshed issue forms, contribution guidance, security policy, repository metadata, and release notes.
- Replaced the misleading “Copy as Wiki link” label with “Copy wiki-style text” and an explicit no-backlink-index note.
- New installations now enable autosave by default; existing explicit preferences remain unchanged during config migration.
- Rebuilt the README feature list from verified code paths and refreshed the gap analysis; unsupported backlinks, DOCX, and direct PDF file export remain clearly open.

### Security

- Updated mature transitive fixes for DOMPurify, linkify-it, protobufjs, undici, and quinn-proto. The remaining OpenTelemetry advisory is isolated to the web-docs build and time-bounded in `osv-scanner.toml`; three newly published Rust fixes stay quarantined until their 14-day package-age floor on 2026-07-22, with exact impact and removal steps in the security ADR.

### Verified

- `yarn workspace @mdviewy/desktop test`
- `yarn workspace @mdviewy/desktop build`
- `yarn workspace @mdviewy/web build:prod`
- `cargo test --workspace`
- `cargo clippy --workspace --all-targets --all-features -- -D warnings`
- `just security`
- `yarn translate:check`

## 0.91.0 - 2026-07-05

### Fixed

- Warm-instance file opens (app already running, opened via Finder/CLI/`open -a`) now call `set_focus()`/`unminimize()` on the target window. Previously the file loaded silently behind other apps with no visible change — looked like the open had failed.
- `scripts/install-mdviewy-app.sh` installed to `~/Applications`, which doesn't exist on this machine; the real app LaunchServices resolves for Finder/CLI/Spotlight is `/Applications/mdviewy.app`. The installed app had drifted 2.5 weeks stale (0.90.2) behind the built source (0.90.3). Install now targets `/Applications` by default (override with `DEST_DIR`); `scripts/raycast/open-mdviewy.sh` updated to match.
- Replaced every remaining occurrence of the old pre-rebrand mark and the generic indigo/violet placeholder gradient with the tarsier app icon: Settings sidebar (`src/assets/logo.svg` was the old black-tile mark), the pre-React boot skeleton and the post-hydration Suspense fallback (`index.html` + `main.tsx`, previously two separately-coded purple squares with different centering math — the boot skeleton mocked a fake sidebar layout that pushed its logo off true-center), and the empty-editor hero (`EmptyState.tsx`). Also fixed `index.html`'s favicon link, which pointed at a non-existent `/src/favicon.svg`.

### Added

- `just install` — builds the desktop app and deploys straight to `/Applications` in one step (strip quarantine, ad-hoc re-sign, re-register with LaunchServices), so a rebuild never leaves Gatekeeper's "unidentified developer" prompt or a stale install behind.

## 0.90.3 - 2026-07-02

### Security

- Enforced a real Content-Security-Policy (was `csp: null`): `script-src 'self'` with Tauri per-launch nonces, `object-src 'none'`, images/media restricted to `asset:`/HTTPS/`data:`/`blob:`, network restricted to IPC + HTTPS + localhost. Includes the required `dangerousDisableAssetCspModification: ["style-src"]` so Tauri's injected style nonce does not disable `'unsafe-inline'` for styled-components (CSP3 rule; without it the app hangs on the boot skeleton — see ADR `2026-06-05-security-posture-1.0.md`). Runtime-verified in the built app: file open, local `asset:` image, remote HTTPS image, tables/ToC, full styling.
- Audited AI key storage: keys live plaintext in the tauri-plugin-store file (`mdviewy_store.bin`); keychain migration stays open for 1.0 and is tracked in the ADR. Security contact in `SECURITY.md` now points to the fork maintainer; added a Security-posture section linking the ADR rationale (broad read-only asset scope stays accepted so any opened Markdown can render its images).

### Fixed

- Made `.md` file opens from Finder/CLI/single-instance/native events reliable: opened-file payloads are now `Vec<String>`/`string[]` paths (no more comma-joined strings that broke on paths with commas/whitespace), with a new `take_opened_paths` Tauri command so files opened before the frontend listener attaches are no longer lost. Paths from `file://` URLs and relative CLI args are normalized on both the Rust (`opened_paths_from_args`) and TS (`parseOpenedPaths`/`normalizeOpenedPath`) sides, each with tests.
- Hardened markdown rendering layout in `GlobalStyles`: long words/URLs wrap instead of overflowing, images/media cap at container width, wide tables scroll horizontally, and a dedicated `mdviewy-page-break` element renders as a dashed rule on screen and a real page break in print.
- Source toolbar: page-break insertion replaces the redundant link-insertion command (covered by `source-code-toolbar.test.ts`).

### Changed

- Simplified toolbar chrome onto the shared semantic `MfIconButton` (MenuButton, MoreActions, SmartActionsButton, SourceCodeMenuButton, CodeCommandButton, InlineReferenceActions), removing ~380 lines of duplicated styled-button code.
- Removed the dead `convert_text` path from `EditorInfoBar` and unused i18n/icon-subset leftovers.

## 0.90.2 - 2026-06-16

### Added

- Added Windows 11 release install guidance to README/docs, including the normal setup EXE, offline WebView2 installer, MSI use case, and SmartScreen note for unsigned prereleases.
- Added `.env.example` and `ATTRIBUTIONS.md` for release hygiene.
- Added a premium brand/logo + mascot concept set in `docs/brand/concepts-2026-06/` (3 abstract marks, 3 mascots — koala/tarsier/loris, and a recommended macOS app-icon tile), generated as self-contained SVGs plus `png/` previews. Recommended v1.0 direction: tarsier app icon + caret mark for small sizes.
- Added `docs/ROADMAP-1.0.md` — masterplan to 1.0 GA (6 phases: truth/naming, signing/distribution, security, tests, brand, release-eng) with per-phase gates and a critical path.
- Applied the new tarsier app icon across all `apps/desktop/src-tauri/icons/*` (png/icns/ico + Square/Store tiles) and `public/logo.png`.
- Added `docs/SIGNING.md` (Apple Developer ID + notarization and Windows Authenticode steps — the #1 GA blocker) and ADR `docs/adr/2026-06-05-security-posture-1.0.md` (CSP plan, assetProtocol rationale, audit policy).
- Added Rust edge tests for file-type detection (case-insensitive, dotfiles, suffix-not-substring) in `mdviewy-utils`.
- Wired lean + security gates into `justfile`: `just lean` (cargo-machete unused-dep scan), `just security` (gitleaks secret scan + osv-scanner lockfile vuln scan), `just ci` (= check), `just pre-pr` (check + lean + security).

### Security

- Cleared all fixable npm advisories: OSV **41 → 0 actionable** (35 vulnerabilities patched). Same-major via root `resolutions` (`postcss` 8.5.10, `prismjs` 1.30.0, `xml2js` 0.5.0, `react-router` 7.15.0, `@octokit/*`, `ip-address` 10, `js-cookie` 3, `json-bigint` 1, `tmp` 0.2.6, `undici` 6.24, `serialize-javascript` 7.0.5) plus major bumps (`uuid` 11, `tar` 7) and a direct `vitest` 3 → 4 upgrade — each verified with `yarn install` + desktop `vitest` (67/67) + `vite build`.
- Added `osv-scanner.toml` documenting the 6 remaining advisories that have **no released upstream fix** (`@ai-sdk/provider-utils` ReDoS; lodash/-es prototype-pollution/template — fix version unreleased, transitive/build-only), each with a reason and a 2026-09-06 review date. Scoped `just security`'s OSV scan to the npm lockfile (Rust advisories stay with `cargo audit`). `just security` now passes clean.

### Changed

- Reworked GitHub release automation for the mdviewy rename: removed stale artifact names and the disabled third-party updater tail, switched Actions to Node 24-compatible pins, and made offline Windows installer assets distinct.
- Aligned root/desktop license metadata with the AGPL root license and clarified public security reporting.
- Hardened release CI by avoiding a missing macOS `sccache` wrapper during Tauri builds and removing the stale contributor-list workflow that failed on GitHub token permissions.
- Trimmed 11 genuinely-unused Rust dependencies across 5 crates (verified by grep + `cargo check --all-features`): `mfdev` (anyhow/env_logger/log/os_pipe), `mdviewy-core` (serde_json/parking_lot/thiserror), `download_npm` (mdviewy-utils), `file_search` (dirs/toml), `mdviewy-utils` (regex). Added `cargo-machete` ignores for the two false-positives (`syntect` feature-gated, `log` macro-only) so `just lean` is clean.
- Removed inherited prerelease disclaimers that contradicted the active release roadmap.
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
