import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('GlobalStyles editor chrome overrides', () => {
  it('keeps RME left-side block hover controls disabled', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url))
    const source = readFileSync(join(currentDir, 'globalStyles.ts'), 'utf8')

    expect(source).toContain('.cm-render-node:hover .cm-render-node-label')
    expect(source).toContain('.rme-block-handler,')
    expect(source).toContain('.rme-draggable-handler,')
    expect(source).toContain('.rme-block-handler *')
    expect(source).toContain('body [class*="rme-block-handler"]')
    expect(source).toContain('visibility: hidden !important;')
    expect(source).toContain('width: 0 !important;')
    expect(source).toContain('pointer-events: none !important;')
  })

  it('keeps markdown preview readable without clickable link styling', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url))
    const source = readFileSync(join(currentDir, 'globalStyles.ts'), 'utf8')

    expect(source).toContain('.markdown-body table')
    expect(source).toContain('overflow-x: auto;')
    expect(source).toContain('white-space: normal;')
    expect(source).toContain('.markdown-body a')
    expect(source).toContain('color: inherit !important;')
    expect(source).not.toContain('.markdown-body a {\n    color: inherit !important;\n    text-decoration: none !important;\n    pointer-events: none;')
    expect(source).toContain('.mdviewy-page-break')
    expect(source).toContain('break-after: page;')
  })

  it('does not normalize whitespace inside code blocks', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url))
    const source = readFileSync(join(currentDir, 'globalStyles.ts'), 'utf8')

    expect(source).toContain('.markdown-body :where(p, li, blockquote, td, th, figcaption)')
    expect(source).not.toContain('.markdown-body :where(p, li, blockquote, td, th, figcaption, pre, code)')
    expect(source).not.toContain('.markdown-body pre {\n    white-space: normal;')
    expect(source).not.toContain('.markdown-body code {\n    white-space: normal;')
  })
})
