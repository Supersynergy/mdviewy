import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('RightBar startup boundary', () => {
  it('does not top-level import heavy right-bar panels', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url))
    const source = readFileSync(join(currentDir, 'RightBar.tsx'), 'utf8')
    const topLevelImports = source
      .split('\n')
      .filter((line) => /^import\s+/.test(line.trim()))
      .join('\n')

    expect(topLevelImports).not.toContain('@/extensions/table-of-content')
    expect(topLevelImports).not.toContain('@/extensions/ai')
  })

  it('refreshes the TOC when returning from another right-bar tab', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url))
    const source = readFileSync(join(currentDir, 'RightBar.tsx'), 'utf8')

    expect(source).toContain('RIGHTBARITEMKEYS.TableOfContent')
    expect(source).toContain("execute('app:toc_refresh')")
    expect(source).toContain('[0, 60, 180]')
  })
})
