import { describe, expect, it } from 'vitest'
import { normalizeOpenedPath, parseOpenedPaths } from './openedPaths'

describe('openedPaths helpers', () => {
  it('normalizes Finder file URLs into real markdown paths', () => {
    expect(normalizeOpenedPath('file:///Users/master/My%20Docs/readme.md')).toBe(
      '/Users/master/My Docs/readme.md',
    )
  })

  it('keeps plus signs significant in file names', () => {
    expect(normalizeOpenedPath('file:///Users/master/C%2B%2B+notes.md')).toBe(
      '/Users/master/C+++notes.md',
    )
  })

  it('accepts the new native array payload without splitting commas in paths', () => {
    expect(parseOpenedPaths(['/Users/master/a,b.md', '/Users/master/c d.md'])).toEqual([
      '/Users/master/a,b.md',
      '/Users/master/c d.md',
    ])
  })

  it('keeps percent escapes significant in native array paths', () => {
    expect(parseOpenedPaths(['/tmp/a%2Fb.md', '/tmp/issue%231.md'])).toEqual([
      '/tmp/a%2Fb.md',
      '/tmp/issue%231.md',
    ])
  })

  it('keeps compatibility with legacy comma-separated payloads', () => {
    expect(parseOpenedPaths('file:///Users/master/a.md, /Users/master/b.md,')).toEqual([
      '/Users/master/a.md',
      '/Users/master/b.md',
    ])
  })
})
