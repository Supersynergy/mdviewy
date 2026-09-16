import { describe, expect, it } from 'vitest'
import { resolveLocalHref } from './localLink'

const DOC = '/Users/master/notes/index.md'

describe('resolveLocalHref', () => {
  it('returns null for web/mailto/data links and anchors', () => {
    expect(resolveLocalHref('https://x.dev', DOC)).toBeNull()
    expect(resolveLocalHref('mailto:a@b.c', DOC)).toBeNull()
    expect(resolveLocalHref('#section', DOC)).toBeNull()
    expect(resolveLocalHref('data:image/png;base64,xx', DOC)).toBeNull()
    expect(resolveLocalHref('', DOC)).toBeNull()
  })

  it('resolves relative links against the document folder', () => {
    expect(resolveLocalHref('./other.md', DOC)).toBe('/Users/master/notes/other.md')
    expect(resolveLocalHref('../assets/x.png', DOC)).toBe('/Users/master/assets/x.png')
    expect(resolveLocalHref('sub/file.txt', DOC)).toBe('/Users/master/notes/sub/file.txt')
  })

  it('keeps absolute and home paths', () => {
    expect(resolveLocalHref('/tmp/a.rs', DOC)).toBe('/tmp/a.rs')
    expect(resolveLocalHref('~/notes/b.md', DOC)).toBe('/Users/master/notes/b.md')
  })

  it('handles file urls, percent escapes, query and fragment', () => {
    expect(resolveLocalHref('file:///tmp/a%20b.pdf', DOC)).toBe('/tmp/a b.pdf')
    expect(resolveLocalHref('./a%20b.md#x?y=1', DOC)).toBe('/Users/master/notes/a b.md')
  })

  it('falls back gracefully without a doc path', () => {
    expect(resolveLocalHref('/abs/x.md')).toBe('/abs/x.md')
    expect(resolveLocalHref('./rel.md')).toBe('./rel.md')
  })
})
