import { describe, expect, it } from 'vitest'
import { normalizeMarkdownSource } from './markdownText'

describe('normalizeMarkdownSource', () => {
  it('drops a UTF-8 BOM so the first heading still parses as a heading', () => {
    expect(normalizeMarkdownSource('\uFEFF# Title')).toBe('# Title')
  })

  it('keeps a BOM that is not at the start of the document', () => {
    expect(normalizeMarkdownSource('text \uFEFF tail')).toBe('text \uFEFF tail')
  })

  it('converts CRLF and lone CR to LF', () => {
    expect(normalizeMarkdownSource('a\r\nb\rc\nd')).toBe('a\nb\nc\nd')
  })

  it('converts Unicode line and paragraph separators to LF', () => {
    expect(normalizeMarkdownSource('a\u2028b\u2029c')).toBe('a\nb\nc')
  })

  it('leaves ordinary Markdown untouched', () => {
    const source = '# Title\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\ntext  with  spaces\n'
    expect(normalizeMarkdownSource(source)).toBe(source)
  })

  it('preserves non-breaking spaces, which are document content', () => {
    expect(normalizeMarkdownSource('z.\u00a0B. hier')).toBe('z.\u00a0B. hier')
  })
})
