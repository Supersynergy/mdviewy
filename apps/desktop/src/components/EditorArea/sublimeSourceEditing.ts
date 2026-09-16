import {
  addCursorAbove,
  addCursorBelow,
  copyLineDown,
  deleteLine,
  insertBlankLine,
  moveLineDown,
  moveLineUp,
  simplifySelection,
  toggleComment,
  transposeChars,
} from '@codemirror/commands'
import { selectSelectionMatches } from '@codemirror/search'
import {
  EditorSelection,
  Prec,
  StateEffect,
  type Extension,
  type SelectionRange,
  type Text,
} from '@codemirror/state'
import { drawSelection, EditorView, keymap, rectangularSelection } from '@codemirror/view'
import type { MfCodemirrorView } from 'rme'

const isMac = typeof navigator !== 'undefined' && /Mac|iP(hone|[oa]d)/.test(navigator.platform)

/**
 * Sublime "Split into Lines" — every line touched by a range becomes its own
 * selection: interior lines in full, first/last line clamped to the range.
 * A bare caret selects its whole line. A range ending exactly on a line start
 * does not create an extra empty selection there.
 */
export function lineSplitRanges(doc: Text, range: SelectionRange): SelectionRange[] {
  if (range.empty) {
    const line = doc.lineAt(range.head)
    return [EditorSelection.range(line.from, line.to)]
  }
  const firstLine = doc.lineAt(range.from)
  let lastLine = doc.lineAt(range.to)
  if (range.to === lastLine.from && lastLine.number > firstLine.number) {
    lastLine = doc.line(lastLine.number - 1)
  }
  const ranges: SelectionRange[] = []
  for (let n = firstLine.number; n <= lastLine.number; n++) {
    const line = doc.line(n)
    const from = Math.max(line.from, range.from)
    const to = Math.min(line.to, range.to)
    ranges.push(
      range.goalColumn === undefined
        ? EditorSelection.range(from, to)
        : EditorSelection.range(from, to, range.goalColumn),
    )
  }
  return ranges
}

const splitSelectionIntoLines = (view: EditorView): boolean => {
  const { state } = view
  const ranges = state.selection.ranges.flatMap((range) => lineSplitRanges(state.doc, range))
  if (ranges.length === 0) return false
  view.dispatch({ selection: EditorSelection.create(ranges) })
  return true
}

/**
 * Sublime-faithful keys. `Prec.high` only for the two that must beat rme's
 * default CodeMirror keymap (Mod-Shift-l is `selectSelectionMatches` upstream —
 * moved to Sublime's Ctrl-Mod-g "quick find all" instead).
 */
const multicursorKeymap = Prec.high(
  keymap.of([
    { key: 'Mod-Shift-l', run: splitSelectionIntoLines },
    { key: 'Ctrl-Mod-g', run: selectSelectionMatches },
  ]),
)

const editingKeymap = keymap.of([
  // Escape first collapses extra cursors; a single selection falls through to
  // the completion/search-panel handlers registered before this keymap.
  { key: 'Escape', run: simplifySelection },
  // Sublime macOS ⌃⇧↑/↓; the Alt-Mod twin survives Mission Control grabbing
  // Ctrl-Shift arrows on some setups.
  { key: 'Ctrl-Shift-ArrowUp', run: addCursorAbove },
  { key: 'Ctrl-Shift-ArrowDown', run: addCursorBelow },
  { key: 'Alt-Mod-ArrowUp', run: addCursorAbove },
  { key: 'Alt-Mod-ArrowDown', run: addCursorBelow },
  // Line ops — Sublime ⌘⇧D duplicate, ⌘⇧K delete, ⌃⌘↑/↓ move.
  { key: 'Mod-Shift-d', run: copyLineDown },
  { key: 'Mod-Shift-k', run: deleteLine },
  { key: 'Ctrl-Mod-ArrowUp', run: moveLineUp },
  { key: 'Ctrl-Mod-ArrowDown', run: moveLineDown },
  { key: 'Mod-/', run: toggleComment },
  { key: 'Mod-Enter', run: insertBlankLine },
  { key: 'Ctrl-t', run: transposeChars },
])

const sublimeExtensions = (): Extension[] => [
  // The missing piece that turns EditorState.allowMultipleSelections (already
  // enabled by rme) into visible, editable multi-caret editing.
  drawSelection(),
  // Option+drag column selection (Sublime default on macOS too).
  rectangularSelection(),
  // ⌘-click adds a caret on macOS, Ctrl-click elsewhere.
  EditorView.clickAddsSelectionRange.of((event) => (isMac ? event.metaKey : event.ctrlKey)),
  multicursorKeymap,
  editingKeymap,
]

/**
 * Injected through `onCodemirrorViewLoad` — `StateEffect.appendConfig` extends
 * the already-constructed EditorState, so no patch of the rme bundle is needed.
 */
export function installSublimeSourceEditing(cmView: MfCodemirrorView): void {
  cmView.cm.dispatch({ effects: StateEffect.appendConfig.of(sublimeExtensions()) })
}
