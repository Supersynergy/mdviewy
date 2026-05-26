import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('Root startup surfaces', () => {
  it('does not top-level import optional dialogs or command palette', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url))
    const source = readFileSync(join(currentDir, 'index.tsx'), 'utf8')
    const topLevelImports = source
      .split('\n')
      .filter((line) => /^import\s+/.test(line.trim()))
      .join('\n')

    expect(topLevelImports).not.toContain('AppInfoDialog')
    expect(topLevelImports).not.toContain('CommandPalette')
    expect(topLevelImports).not.toContain('WorkspaceDialog')
    expect(topLevelImports).not.toContain('BookMarkDialog')
    expect(topLevelImports).not.toContain('SettingDialog')
  })

  it('keeps a lightweight command palette trigger before the lazy palette mounts', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url))
    const source = readFileSync(join(currentDir, 'DeferredRootSurfaces.tsx'), 'utf8')

    expect(source).toContain('mf:cmd_palette:open')
    expect(source).toContain('keydown')
    expect(source).toContain('openRequest')
    expect(source).toContain('onReady')
  })

  it('keeps lazy settings off the broad router barrel', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url))
    const source = readFileSync(join(currentDir, '../Setting/component/SettingDialog.tsx'), 'utf8')
    const topLevelImports = source
      .split('\n')
      .filter((line) => /^import\s+/.test(line.trim()))
      .join('\n')

    expect(topLevelImports).not.toContain("from '@/router'")
  })
})
