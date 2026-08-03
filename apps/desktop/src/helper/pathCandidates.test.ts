import { describe, expect, it } from 'vitest'
import {
  expandHome,
  findPathCandidates,
  pathLabel,
  resolveAgainst,
  trimPathCandidate,
} from './pathCandidates'

describe('findPathCandidates', () => {
  it('finds absolute, home, and relative paths in prose', () => {
    const text = 'Siehe /Users/max/notes/a.md und ~/BASE/data/x.csv sowie ./docs/SPEC.md.'

    expect(findPathCandidates(text)).toEqual([
      '/Users/max/notes/a.md',
      '~/BASE/data/x.csv',
      './docs/SPEC.md',
    ])
  })

  it('strips Markdown punctuation around a path', () => {
    expect(trimPathCandidate('(`/tmp/a.md`),')).toBe('/tmp/a.md')
  })

  it('ignores URLs', () => {
    expect(findPathCandidates('https://example.com/a/b')).toEqual([])
  })

  it('caps how many paths a pasted log can contribute', () => {
    const text = Array.from({ length: 20 }, (_, i) => `/tmp/f${i}.md`).join(' ')

    expect(findPathCandidates(text)).toHaveLength(5)
  })

  it('returns nothing for text without paths', () => {
    expect(findPathCandidates('just a sentence')).toEqual([])
  })
})

describe('path resolution', () => {
  it('expands ~ against the home directory', () => {
    expect(expandHome('~/notes/a.md', '/Users/max')).toBe('/Users/max/notes/a.md')
    expect(expandHome('/abs/a.md', '/Users/max')).toBe('/abs/a.md')
    expect(expandHome('~/a.md')).toBe('~/a.md')
  })

  it('resolves relative paths against the document folder', () => {
    expect(resolveAgainst('./docs/SPEC.md', '/repo/app')).toBe('/repo/app/docs/SPEC.md')
    expect(resolveAgainst('../README.md', '/repo/app')).toBe('/repo/README.md')
    expect(resolveAgainst('/already/abs.md', '/repo/app')).toBe('/already/abs.md')
  })

  it('labels a path by its last segment', () => {
    expect(pathLabel('/repo/app/docs/SPEC.md')).toBe('SPEC.md')
    expect(pathLabel('/repo/app/')).toBe('app')
  })
})
