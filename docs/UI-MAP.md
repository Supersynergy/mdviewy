# mdviewy UI Map

Status: restored from the local Claude file history on 2026-05-26.

## Layout

```text
Root
|-- Left SideBar
|   |-- Explorer
|   |-- Bookmarks
|   `-- Search trigger -> CommandPalette content mode
|-- Center EditorArea
|   |-- tabs
|   |-- WYSIWYG / source / preview toolbars
|   `-- editor panel
|-- RightBar
|   |-- QuickSearchBar
|   `-- CustomToc
`-- StatusBar
    |-- PaletteBtn
    |-- WorkspaceBtn
    |-- EditorModeBtn
    `-- layout toggles
```

## Commands

| Shortcut | Command |
| --- | --- |
| Cmd+K | Command palette |
| Cmd+P | Quick-open files |
| Cmd+Shift+P | Commands palette |
| Cmd+Shift+F | Find in files |
| Cmd+F | Focus right-sidebar quick find |
| Cmd+Shift+M | Toggle editor mode |
| Alt+Up / Alt+Down | Previous / next heading |
| Cmd+Alt+Left / Cmd+Alt+Right | Previous / next tab |

## Components

- `components/CommandPalette`: fuzzy file, command, recent, and content search.
- `components/QuickSearchBar`: active-document quick find with history.
- `components/Explorer`: file filter, tree/flat views, and frecency list.
- `components/TableOfContent/CustomToc`: chapter-numbered TOC renderer.
- `hooks/useExternalLinks`: routes external links through Tauri opener.

## Verification Recipes

```sh
rg -l 'CommandPalette' apps/desktop/src
ast-grep --lang ts --pattern 'addCommand({ id: $ID, handler: $$$ })' apps/desktop/src
ast-grep --lang tsx --pattern 'useEffect($$$, [])' apps/desktop/src
rg 'KeybindingInfo::new' apps/desktop/src-tauri/src/app/keybindings.rs
```
