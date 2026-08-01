import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { normalizeEditorContentWidth } from './EditorWrapper'

const source = readFileSync(join(__dirname, 'EditorWrapper.tsx'), 'utf8')

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

  it('keeps adaptive on the window instead of a centred column', () => {
    expect(source).toContain("adaptive: '100%'")
    // A `max(…px, …vw)` floor re-centres the document and reopens side gutters.
    expect(source).not.toMatch(/adaptive: '[^']*max\(/)
  })

  it('keeps the edge margin small and lets full width go edge to edge', () => {
    expect(source).toContain("'clamp(9px, 1.25vw, 24px)'")
    expect(source).toContain("props.contentWidth === 'full' ? '0px'")
  })

  it('keeps parsed Markdown delimiters hidden in Pretty mode', () => {
    expect(source).toContain('& .md-mark')
    expect(source).toContain('display: none !important')
    expect(source).toContain('font-size: 0 !important')
    expect(source).not.toContain("replace(/\\\\\\*/")
  })
})
