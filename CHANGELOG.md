# Changelog

## 0.101.0 - 2026-09-16

mdviewy becomes a general local document workspace. It opens source code, RTF,
PDF, and images next to Markdown, edits text with multiple cursors, follows
local links, and takes files from Finder, shells, deep links, and agents.

### Added

- **Multi-cursor editing in Source mode.** `⌘-click` adds a caret (Ctrl-click
  off macOS), `⌥-drag` makes a rectangular column selection, `⌘D` selects the
  next occurrence, `⌃⌘G` selects every occurrence at once, `⌘⇧L` splits a
  multi-line selection into one selection per line, `⌃⇧↑/↓` (or `⌥⌘↑/↓`) adds
  a caret on the line above/below, `Esc` collapses to one cursor. Typing,
  deleting, pasting, and undo apply to all carets as a single edit step.
- **Sublime line ops in Source mode:** `⌘⇧D` duplicates the line, `⌘⇧K` deletes
  it, `⌃⌘↑/↓` moves it, `⌘/` toggles comments, `⌘↩` opens a blank line below,
  `⌃T` transposes characters.
- **More formats open natively:**
  - ~120 code extensions (`.py`, `.rs`, `.ts`, `.go`, `.sh`, `.sql`, …) open in
    the source editor with syntax highlighting resolved via
    `@codemirror/language-data` filename matching, plus dotfiles like
    `.gitignore`, `.env`, `Dockerfile`, `Makefile`.
  - `.rtf` renders as readable text via a built-in converter; `⌘⇧M` toggles to
    the raw RTF source.
  - `.pdf` renders page-by-page via pdf.js, loaded lazily on first use.
  - Images: `.webp`, `.avif`, `.tiff`, `.bmp`, `.ico` in addition to
    png/jpg/gif.
  - The workspace file tree lists every openable type instead of only Markdown.
- **Local links resolve and open.** `[x](./notes.md)`, `file://`, `~/…`, and
  bare paths resolve against the document's folder and open inside mdviewy when
  the type is renderable, else in the system application. Ways in: `⌘-click` in
  the pretty editor, click in preview, the hover bar (now active in WYSIWYG
  too), or right-click → *Open / Reveal in Finder / Open with default app /
  Copy path*. Preview links use the accent color with a soft underline on hover
  instead of `color: inherit`.
- **Opening from outside the app.** `mdviewy://open?path=/abs/file` deep links,
  `mdviewy <path>` argv handling on macOS (previously Linux/Windows only), a
  `scripts/mdviewy` CLI wrapper, and file associations for code, RTF, PDF, and
  images so `open -a mdviewy <file>` works from Finder, shells, and agents.
  Paths that cannot be displayed surface a toast instead of failing silently.

### Changed

- **Faster boot and link.** The boot chunk no longer eagerly loads
  remirror/mermaid through a stray `rme` value import; `crate-type` is
  `rlib`-only (drops two fat-LTO links per release build); the dormant
  `mdviewy-core` `full` feature (tantivy/syntect/comrak) is out of the app
  binary; window state saves once at close instead of on every window event;
  app config and the recent-files cache only write when something changed.

### Fixed

- **File associations reach the bundle.** The hand-maintained
  `src-tauri/info.plist` overrode `CFBundleDocumentTypes` wholesale, so
  `bundle.fileAssociations` never landed in the packaged app; the plist now
  carries the full type list (folder, text, ~50 code extensions, PDF, images).
- **Install script no longer copies a stale bundle.** It resolved
  `./target/release` while this machine's cargo `target-dir` is
  `~/.cargo-target`; it now asks `cargo metadata` for the effective target
  directory. Release binary 19.99 MB → 15.68 MB.
- **h2 0.4.19** (RUSTSEC-2026-0258) and **rustls 0.23.45** (RUSTSEC-2026-0285).

### Verified

- `yarn vitest`: 45 files, 181 tests
- `yarn tsc --noEmit`
- `cargo fmt --check` / `cargo clippy -D warnings` / `cargo nextest` (31 tests)
- `cargo audit` clean
- Boot to window: ~69 ms; `open "mdviewy://open?path=…"` and Finder
  double-click route into the running instance

## 0.100.0 - 2026-08-03

### Added

- **Chatterbox voice clones in Speak selection.** Four locally cloned German voices — Maria (warm), Axel (deep), Conrad (calm), Emily (soft) — render through the Resemble Chatterbox model on the machine, free and offline. They appear only when the `chatterbox-say` wrapper is installed. Each entry says up front that the clone renders before it plays (~90 s model load); input is capped at ~2000 characters so a menu call stays interactive.
- **Speak document.** Right-click with nothing selected reads the whole document aloud with any installed voice, using the rendered text rather than the Markdown source — no spoken asterisks or pipes.

### Fixed

- **Stop speaking now stops wrapper engines completely.** Speech runs in its own process group and stopping kills the group, so a renderer or player behind a wrapper script can no longer keep talking after its shell is gone.

## 0.99.0 - 2026-08-03

### Added

- **Speak selection** in the right-click menu, with the voices installed on the machine: the macOS system voice (offline, always there), Jarvis · German (Piper / Thorsten), and Jarvis · English (Kokoro) — plus `Stop speaking`. Engines are detected by binary, so a voice you have not installed never appears. Speech runs through a native command with the text passed as one argument; no shell, no injection surface.
- **Paths become actions.** Any path in the selection — absolute, `~/…`, or relative to the document — gets its own submenu: reveal in Finder, open, open a terminal there, copy. Relative paths resolve against the document's folder.
- **Ask an agent** hands the selection to Claude Code or Codex in your preferred terminal, and falls back to the clipboard when the terminal cannot take a command.
- **Line tools** for a multi-line selection: sort A→Z, sort Z→A, remove duplicates, reverse.
- **Insert today's date** when nothing is selected.

## 0.98.0 - 2026-08-03

### Added

- The editor has its own right-click menu. Until now the WebView's default menu appeared — Look Up, Translate, Spelling, Substitutions, Transformations, Font, Speech, Paragraph Direction, Selection Direction, Share, AutoFill, Services — sixteen entries, of which three did anything useful in a Markdown editor.
- The menu reads what is under the pointer and offers only what applies there:
  - **Link**: open it, copy the address, copy the link text.
  - **Table cell**: row above/below, column left/right, delete row/column/table.
  - **Image**: copy the image path.
  - **Selection**: cut, copy, format (bold, italic, inline code, strikethrough), turn into (H1–H3, bullet/numbered/task list, quote, code block), find that text in the document, copy it as an AI prompt.
  - **No selection**: paste, paste as plain text, insert table/code block/divider, find in document.
  - **Always**: reveal the file in Finder, copy its path.
- Entries are built from the commands the document actually has, so the menu cannot show a dead action. Shortcuts are printed next to the entries that have one.
- `Find “<selection>”` opens the find panel with the term filled in.

## 0.97.0 - 2026-08-01

### Fixed

- Halved the margin around the document and removed the last cause of side whitespace: `adaptive` had a `max(1120px, …)` floor, so on any window narrower than ~1130px the document was capped at 1120px and re-centred with gutters. It now follows the window, `full` runs edge to edge, and the padding shrank from `clamp(18px, 2.5vw, 48px)` to `clamp(9px, 1.25vw, 24px)`.
- Native menubar coverage is complete: all 40 menu ids resolve to a handler (`Go ▸ Go to Heading` included). Verified by a wiring audit over menu ids, registered commands, and bus listeners.

### Changed

- Menu commands live in one place. `useCommandInit` registered `Quick Open`, `Find in Files`, `Recent Files`, tab cycling, GitHub, and Report Issue; `useNativeMenuCommands` registered them again with different behaviour. The duplicates are gone and the surviving handlers open links in the system browser instead of the WebView.

### Note

- The 0.95.0 entry overstated the menu fix: `Quick Open`, `Find in Files`, next/previous tab, GitHub, and Report Issue already had handlers. Genuinely dead before 0.95.0 were New File, New Window, Open File, Save As, and Close Window.

## 0.96.0 - 2026-08-01

### Fixed

- The code-block copy button no longer looks like it vanishes after a copy. `ri-check-line` was missing from the generated Remixicon subset, so the success icon rendered as nothing; RME's runtime icons are now part of the subset and the button spells out `Copied!`.
- `Edit ▸ Find Next` and `Find Previous` do something: they step through matches, and open the find panel first when it is closed.

### Changed

- `Open terminal here` and the Claude Code / Codex handoffs use the terminal you actually installed — cmux, Ghostty, WezTerm, kitty, Alacritty, iTerm, Warp, then Terminal.app. Terminals that accept a command start the agent directly; the others still open the folder and put the command on the clipboard.
- `Reveal in Finder` sits at the top of the Smart menu, the Smart panel, and the file-tree context menu, where the most valuable action belongs.

## 0.95.0 - 2026-07-31

Supersedes tags `v0.93.0` and `v0.93.1`, which carried this same work.

### Fixed

- Tables now use the available width and wrap their cell text instead of sizing to their longest cell behind a horizontal scrollbar. Cells break long words but keep their longest word as a column minimum, so headers stay readable.
- Headings, definition lists, `summary`, and table captions now collapse source whitespace like every other block. Runs of spaces in the Markdown source (`## NMN  (7)`) no longer leak into the rendered document; `pre`, `code`, `kbd`, and `samp` keep their whitespace.
- Markdown is normalized as it is read from disk: a leading UTF-8 BOM is dropped (it kept the first `#` from parsing as a heading), CRLF/CR becomes LF, and U+2028/U+2029 become real line breaks. Non-breaking spaces are preserved as document content. Saving such a file writes back the normalized text.
- `adaptive` content width follows the window instead of stopping at a 1600px column, which left several hundred pixels of empty margin on each side of a wide display.
- Large folders open again. The workspace scan now truncates at its budget instead of failing the whole open with “This folder is too large to open safely”.
- Opening a folder no longer asks “current window or new window?” first. It opens in the current window; a folder already open elsewhere focuses that window.
- Toolbar and status-bar menus toggle: clicking the trigger while its menu is open closes it instead of reopening it.
- Find and Replace opens without a wait — its chunk is warmed while the app is idle instead of being fetched on the first Cmd+F.
- Blockquotes render as a quiet rule with full text contrast instead of a grey box with washed-out text.
- Native menu entries that emitted a command nothing handled now work: New File, New Window, Open File, Quick Open, Save As, Find in Files, next/previous tab, Close Window, GitHub, and Report Issue.

### Added

- Editor toolbar: view switcher (Source/Pretty/Preview), strikethrough, table, code block, divider line, and — on the trailing edge — find and replace plus left/right sidebar toggles that show their current state. Each button names its shortcut.
- Editor menu: find and replace, command palette, sidebar toggles, reset layout, save now, recent documents, open folder, and settings, each with its keyboard shortcut in plain text.
- Recent documents: the last 20 opened files are remembered across restarts, listed in the editor menu and in the native `File ▸ Open Recent` submenu (with `Clear Recent`). Recent folders now keep 20 entries instead of 12.
- Native menubar: `Open Recent`, `Open File…`, export as HTML/image, print/PDF, an `Editor Mode` submenu, zoom in/out/actual size, reset layout, next/previous heading, sidebar toggles, and keyboard shortcuts.

### Changed

- Prose blocks use `text-wrap: pretty` and headings `text-wrap: balance` where the WebView supports it, so line breaks avoid orphans.
- Tables have a rounded frame, single-line borders, and even row padding.

## 0.92.1 - 2026-07-15

### Fixed

- macOS prerelease builds now seal the complete `.app` bundle with a valid ad-hoc CodeResources signature before rebuilding each DMG. The release job mounts the rebuilt image and runs strict deep signature verification, preventing green CI from publishing a structurally invalid app bundle.

### Verified

- `scripts/prepare-macos-prerelease.sh target/release/bundle`
- Downloaded-release DMG checksum, mount, bundle identifier, architecture, version, and `codesign --verify --deep --strict`

## 0.92.0 - 2026-07-15

### Fixed

- Removed the startup folder suggestions that recursively opened large home, Claude, and Codex trees. Workspace scans are now bounded by entry count and depth, and failures reject visibly instead of leaving a pending promise.
- Removed unsafe startup/new-window debug scripts that broke WebView initialization when a path contained an apostrophe. Warm Finder/CLI opens now use a direct native-to-window bridge with queued event fallbacks, so paths survive listener and focus races.
- Pretty mode now hides formatting delimiters at the caret while preserving intentional escaped stars as literal text.
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
- Removed the project-wide `sccache` requirement so clean CI runners and source builds work with the standard Rust toolchain.
- Made native window setup warning-clean on both macOS and Linux so strict cross-platform Clippy gates match local builds.
- Rebuilt the README feature list from verified code paths and refreshed the gap analysis; unsupported backlinks, DOCX, and direct PDF file export remain clearly open.

### Security

- Updated mature transitive fixes for DOMPurify, linkify-it, protobufjs, undici, quinn-proto, anyhow, and memmap2. Yarn is now 4.17.0 with a repository-enforced 14-day package age gate. The remaining OpenTelemetry advisory is isolated to the web-docs build and time-bounded in `osv-scanner.toml`; three newly published Rust fixes stay quarantined until their 14-day package-age floor on 2026-07-22, with exact impact and removal steps in the security ADR.

### Verified

- `yarn workspace @mdviewy/desktop test`
- `yarn build`
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
