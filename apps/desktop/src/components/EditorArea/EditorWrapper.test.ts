import { describe, expect, it } from 'vitest'
import { normalizeEditorContentWidth } from './EditorWrapper'

describe('editor content width', () => {
  it.each(['adaptive', 'focused', 'wide', 'full'] as const)('keeps %s mode', (mode) => {
    expect(normalizeEditorContentWidth(mode)).toBe(mode)
  })

  it('uses adaptive width for old or invalid settings', () => {
    expect(normalizeEditorContentWidth(undefined)).toBe('adaptive')
    expect(normalizeEditorContentWidth('980px')).toBe('adaptive')
  })

  it('keeps legacy full-width users on full width', () => {
    expect(normalizeEditorContentWidth(undefined, true)).toBe('full')
  })
})
