import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('AppThemeProvider startup boundary', () => {
  it('does not import the editor runtime at app-shell startup', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url))
    const source = readFileSync(join(currentDir, 'AppThemeProvider.tsx'), 'utf8')
    const topLevelImports = source
      .split('\n')
      .filter((line) => /^import\s+/.test(line.trim()))
      .join('\n')

    expect(topLevelImports).not.toContain("from 'rme'")
  })
})
