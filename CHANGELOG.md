# Changelog

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
