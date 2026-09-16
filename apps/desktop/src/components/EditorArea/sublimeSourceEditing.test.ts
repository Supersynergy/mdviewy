import { EditorSelection, EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { lineSplitRanges } from './sublimeSourceEditing'

const doc = (text: string) => EditorState.create({ doc: text }).doc

const span = (range: { from: number; to: number }, text: string) => text.slice(range.from, range.to)

describe('lineSplitRanges (Sublime ⌘⇧L)', () => {
  const text = 'alpha\nbravo\ncharlie\ndelta'

  it('splits a multi-line selection into one selection per line', () => {
    const d = doc(text)
    // "pha\nbravo\ncha" — part of line 1, all of line 2, part of line 3
    const ranges = lineSplitRanges(d, EditorSelection.range(2, 15))
    expect(ranges.map((r) => span(r, text))).toEqual(['pha', 'bravo', 'cha'])
  })

  it('keeps edge lines clamped and interior lines whole', () => {
    const d = doc(text)
    const ranges = lineSplitRanges(d, EditorSelection.range(3, 18))
    expect(ranges.map((r) => [r.from, r.to])).toEqual([
      [3, 5],
      [6, 11],
      [12, 18],
    ])
  })

  it('turns a bare caret into a whole-line selection', () => {
    const d = doc(text)
    const caret = EditorSelection.cursor(8) // inside "bravo"
    const ranges = lineSplitRanges(d, caret)
    expect(ranges.map((r) => span(r, text))).toEqual(['bravo'])
  })

  it('does not select the last line when the range ends at its start', () => {
    const d = doc(text)
    const ranges = lineSplitRanges(d, EditorSelection.range(0, 12)) // "alpha\nbravo\n"
    expect(ranges.map((r) => span(r, text))).toEqual(['alpha', 'bravo'])
  })

  it('keeps a caret on an empty interior line', () => {
    const d = doc('a\n\nb')
    const ranges = lineSplitRanges(d, EditorSelection.range(0, 4))
    expect(ranges.map((r) => [r.from, r.to])).toEqual([
      [0, 1],
      [2, 2],
      [3, 4],
    ])
  })
})
