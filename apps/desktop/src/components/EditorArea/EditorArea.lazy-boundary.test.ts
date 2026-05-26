import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('EditorArea startup boundary', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url))
  const readSource = (relativePath: string) => readFileSync(join(currentDir, relativePath), 'utf8')
  const topLevelImports = (relativePath: string) => {
    const source = readSource(relativePath)
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

  it('keeps optional find/replace UI and Ant Design styles out of the eager editor path', () => {
    const workspaceImports = topLevelImports('EditorWorkspace.tsx')
    const textEditorImports = topLevelImports('TextEditor.tsx')

    expect(workspaceImports).not.toContain('FindReplace')
    expect(workspaceImports).not.toContain('editorToolBar/FindReplace')
    expect(textEditorImports).not.toContain("@/antdStyles")
  })

  it('keeps a lightweight find/replace command bridge before the lazy UI mounts', () => {
    const source = readSource('DeferredEditorSurfaces.tsx')

    expect(source).toContain("id: 'app_findReplaceEditor'")
    expect(source).toContain('lazy(() =>')
    expect(source).toContain('findReplaceVisible')
  })
})
