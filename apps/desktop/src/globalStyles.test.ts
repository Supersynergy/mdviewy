import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('GlobalStyles editor chrome overrides', () => {
  it('keeps RME left-side block hover controls disabled', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url))
    const source = readFileSync(join(currentDir, 'globalStyles.ts'), 'utf8')

    expect(source).toContain('.cm-render-node:hover .cm-render-node-label')
    expect(source).toContain('.markdown-body .rme-block-handler')
    expect(source).toContain('.markdown-body .rme-draggable-handler')
    expect(source).toContain('pointer-events: none !important;')
  })
})
