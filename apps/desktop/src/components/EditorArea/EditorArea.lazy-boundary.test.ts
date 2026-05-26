import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('EditorArea startup boundary', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url))
  const topLevelImports = (relativePath: string) => {
    const source = readFileSync(join(currentDir, relativePath), 'utf8')
    return source
      .split('\n')
      .filter((line) => /^import\s+/.test(line.trim()))
      .join('\n')
  }

  it('does not top-level import the heavy editor workspace', () => {
    const imports = topLevelImports('index.tsx')

    expect(imports).not.toContain("from './Editor'")
    expect(imports).not.toContain("from './EditorAreaTabs'")
    expect(imports).not.toContain('editorToolBar')
    expect(imports).not.toContain("from 'rme'")
  })

  it('keeps export-only and reporting-only dependencies out of the editor chunk', () => {
    const imports = topLevelImports('TextEditor.tsx')

    expect(imports).not.toContain("from 'html2canvas'")
    expect(imports).not.toContain("@sentry/react")
  })
})
