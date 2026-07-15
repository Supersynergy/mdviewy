# Roadmap to mdviewy 1.0

Status: 0.92 release candidate. Updated 2026-07-15.

The product direction is fixed: a calm, local-first Markdown workspace. New work must improve file trust, reading fidelity, speed, or user control.

## Shipped in 0.92

- [x] Finder, Explorer, CLI, and warm-instance file opens use a focused layout.
- [x] Startup no longer suggests or indexes home, Claude, or Codex folders.
- [x] Folder scans have entry and depth limits and return visible errors.
- [x] Render failures show reload and safe-start recovery instead of a white screen.
- [x] Paths with quotes or apostrophes cannot break new-window initialization.
- [x] Saves use durable same-directory temporary files and atomic replacement.
- [x] README files open in a sanitized GitHub-style preview with relative assets and safe links.
- [x] GitHub-only constructs fail closed to Source mode when WYSIWYG would be lossy.
- [x] Adaptive/focused/wide/full content widths and Print / Save as PDF.
- [x] Smart Actions expose frontmatter, outline, word insights, document briefs, paths, repositories, and agent handoffs.
- [x] CI runs frontend tests/build plus Rust fmt/check/clippy/tests with pinned actions.

## 1.0 release gates

### File trust

- [ ] Detect external edits and require an explicit reload/overwrite choice before saving.
- [ ] Add persistent crash recovery or lightweight local revisions.
- [ ] Exercise open → edit → save → reopen with desktop end-to-end tests.
- [ ] Test large, empty, non-UTF8, permission-denied, and concurrent-save fixtures on all platforms.

### Distribution

- [ ] Sign and notarize macOS builds with an Apple Developer ID.
- [ ] Sign Windows installers and document the SmartScreen reputation path.
- [ ] Verify AppImage, deb, and rpm on clean Linux environments.
- [ ] Decide between signed automatic updates and a documented manual-only update policy.

### Markdown fidelity

- [ ] Add golden round-trip fixtures for tables, reference badges, alerts, tasks, footnotes, raw HTML, Mermaid, and math.
- [x] Add GitHub alert presentation to the dedicated preview.
- [ ] Add GitHub footnote presentation and golden fixtures.
- [ ] Preserve unsupported syntax byte-for-byte across every edit-mode transition.

### Security and privacy

- [ ] Move AI provider keys into operating-system credential storage.
- [ ] Narrow local asset access to the opened file/workspace without breaking standalone documents.
- [ ] Re-run dependency, secret, and capability audits before the 1.0 tag.

## Explicit non-goals for 1.0

- Account system, cloud sync, collaboration backend, or proprietary document format.
- Automatic indexing of a home directory.
- Hidden network calls or default-on AI.
- Plugin machinery without a measured core workflow benefit.

## Release oracle

1. `yarn workspace @mdviewy/desktop test` and production build pass.
2. Rust fmt, check, clippy with warnings denied, and workspace tests pass.
3. Security and secret scans pass with documented, time-bounded exceptions only.
4. Signed packages install and open on clean macOS, Windows, and Linux systems.
5. The open → edit → save → reopen fixture is byte-correct on each platform.
