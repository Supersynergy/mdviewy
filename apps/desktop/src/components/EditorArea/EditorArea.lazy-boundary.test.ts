import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('EditorArea startup boundary', () => {
  it('does not top-level import the heavy editor workspace', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url))
    const source = readFileSync(join(currentDir, 'index.tsx'), 'utf8')
    const topLevelImports = source
      .split('\n')
      .filter((line) => /^import\s+/.test(line.trim()))
      .join('\n')

    expect(topLevelImports).not.toContain("from './Editor'")
    expect(topLevelImports).not.toContain("from './EditorAreaTabs'")
    expect(topLevelImports).not.toContain('editorToolBar')
    expect(topLevelImports).not.toContain("from 'rme'")
  })
})
