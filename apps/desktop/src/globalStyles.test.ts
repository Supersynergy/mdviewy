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
    expect(source).toContain('white-space: normal;')
    expect(source).toContain('.markdown-body a')
    expect(source).toContain('color: inherit !important;')
    expect(source).not.toContain('.markdown-body a {\n    color: inherit !important;\n    text-decoration: none !important;\n    pointer-events: none;')
    expect(source).toContain('.mdviewy-page-break')
    expect(source).toContain('break-after: page;')
  })

  it('lets tables use the available width and wrap their cells', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url))
    const source = readFileSync(join(currentDir, 'globalStyles.ts'), 'utf8')

    expect(source).toContain('.markdown-body.markdown-body table {\n    display: table;')
    expect(source).toContain('table-layout: auto;')
    expect(source).not.toContain('\n    width: max-content;')
    // Doubled class outranks the RME cell rule without !important.
    expect(source).toContain('.markdown-body.markdown-body table :is(th, td)')
    expect(source).toContain('min-width: 0;')
    // Cells break long words but keep their longest word as a column minimum.
    expect(source).toContain('overflow-wrap: break-word;')
  })

  it('collapses source whitespace in headings, not only in paragraphs', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url))
    const source = readFileSync(join(currentDir, 'globalStyles.ts'), 'utf8')

    const normalizeRule = source
      .split('.markdown-body :where(p, li, blockquote,')[1]
      ?.split('}')[0]

    expect(normalizeRule).toBeDefined()
    for (const selector of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'dt', 'dd', 'summary', 'caption']) {
      expect(normalizeRule).toContain(selector)
    }
    expect(normalizeRule).not.toContain('pre')
    expect(normalizeRule).not.toContain('code')
  })

  it('does not normalize whitespace inside code blocks', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url))
    const source = readFileSync(join(currentDir, 'globalStyles.ts'), 'utf8')

    expect(source).toContain('.markdown-body :where(p, li, blockquote, td, th, figcaption,')
    expect(source).not.toContain('pre, code) {\n    white-space: normal;')
    expect(source).not.toContain('.markdown-body pre {\n    white-space: normal;')
    expect(source).not.toContain('.markdown-body code {\n    white-space: normal;')
  })

  it('confirms a code-block copy in words, not only by icon', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url))
    const source = readFileSync(join(currentDir, 'globalStyles.ts'), 'utf8')

    expect(source).toContain(".cm-copy-btn[title='Copied!']")
    expect(source).toContain("content: 'Copied!';")
  })

  it('prints only the active document without app chrome', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url))
    const source = readFileSync(join(currentDir, 'globalStyles.ts'), 'utf8')

    expect(source).toContain("body.${'mdviewy-printing'} *")
    expect(source).toContain("[data-mdviewy-active-editor='true']")
    expect(source).toContain('max-width: none !important;')
    expect(source).toContain('overflow: visible !important;')
  })
})
