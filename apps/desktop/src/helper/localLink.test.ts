import { describe, expect, it } from 'vitest'
import { isDangerousExecPath, resolveLocalHref } from './localLink'

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
    // Encoded #/? belong to the file name, not the URL syntax.
    expect(resolveLocalHref('file:///tmp/a%23b.md', DOC)).toBe('/tmp/a#b.md')
  })

  it('rejects non-local schemes instead of mangling them into paths', () => {
    expect(resolveLocalHref('obsidian://open?vault=x', DOC)).toBeNull()
    expect(resolveLocalHref('vscode://file/tmp/x.ts', DOC)).toBeNull()
    expect(resolveLocalHref('ftp://host/f.zip', DOC)).toBeNull()
  })

  it('keeps Windows drive and UNC paths absolute', () => {
    expect(resolveLocalHref('C:\\docs\\a.md', DOC)).toBe('C:\\docs\\a.md')
    expect(resolveLocalHref('C:/docs/a.md', DOC)).toBe('C:/docs/a.md')
  })

  it('rejects relative links without a doc path instead of using cwd', () => {
    expect(resolveLocalHref('/abs/x.md')).toBe('/abs/x.md')
    expect(resolveLocalHref('./rel.md')).toBeNull()
    expect(resolveLocalHref('../up.md')).toBeNull()
  })

  it('rejects file urls that name a remote host', () => {
    expect(resolveLocalHref('file://nas/share/x.md', DOC)).toBeNull()
    expect(resolveLocalHref('file://localhost/tmp/x.md', DOC)).toBe('/tmp/x.md')
  })

  it('blocks execute-on-open targets', () => {
    expect(isDangerousExecPath('/tmp/x.command')).toBe(true)
    expect(isDangerousExecPath('/tmp/x.app')).toBe(true)
    expect(isDangerousExecPath('/tmp/x.exe')).toBe(true)
    expect(isDangerousExecPath('/tmp/x.sh')).toBe(false)
    expect(isDangerousExecPath('/tmp/x.md')).toBe(false)
  })
})
