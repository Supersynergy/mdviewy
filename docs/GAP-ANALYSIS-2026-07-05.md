# mdviewy feature audit

Updated 2026-07-15 after the 0.92 implementation and competitor/code research.

## Current strengths

| Need | Current answer |
| --- | --- |
| Read local Markdown quickly | Native file association, warm-instance open, focus layout, adaptive width |
| Keep ownership of files | Ordinary files on disk, no account or import database |
| Read modern READMEs | Dedicated sanitized GFM preview, raw HTML, tables, tasks, alerts, relative assets, safe links |
| Write in preferred mode | Source, WYSIWYG, preview, tabs, spellcheck, typewriter scroll |
| Navigate a workspace | Tree, quick open, search, outline, bookmarks, recent files |
| Use document intelligence | Metadata, outline, counts, deterministic brief, path/repository actions, optional AI |
| Export work | HTML, image, Print / Save as PDF |
| Recover from failures | Atomic saves, bounded scans, visible folder errors, safe-start error boundary |

## Ranked remaining gaps

1. **External-edit conflict protection — critical, medium effort.** The watcher refreshes metadata but save does not yet compare the loaded revision with the current disk revision.
2. **Desktop end-to-end save oracle — high, medium effort.** Unit and component coverage is healthy; the release still needs automated open → edit → save → reopen checks on real WebViews.
3. **Persistent recovery/revisions — high, medium-to-large effort.** Editor undo is session-local. A small bounded recovery journal would protect work without becoming a notes database.
4. **Complete GitHub semantic preview — medium-high, medium effort.** Footnotes still need dedicated presentation and golden fixtures; unsupported WYSIWYG editing already fails closed.
5. **Workspace tags/filtering — medium, medium effort.** Frontmatter is parsed per document but tags are not a workspace navigation surface.
6. **DOCX/direct PDF generation — medium, medium effort.** Print-to-PDF exists. DOCX/Pandoc integration should remain optional and explicit.
7. **Wikilinks/backlinks — conditional, large effort.** Useful only if mdviewy deliberately expands from reader/editor into personal-knowledge management; not a 1.0 default.

## Product rule

Prefer reliable Markdown fidelity and fast file handling over feature count. A feature ships only when it has an executable contract, does not silently rewrite source, and keeps the local-first promise.
