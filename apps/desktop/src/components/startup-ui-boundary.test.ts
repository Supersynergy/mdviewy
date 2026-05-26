import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const currentDir = dirname(fileURLToPath(import.meta.url))

const readComponent = (relativePath: string) =>
  readFileSync(join(currentDir, relativePath), 'utf8')

describe('startup UI boundary', () => {
  it('keeps Ant Design out of always-mounted shell widgets', () => {
    const startupWidgets = [
      'Explorer/index.tsx',
      'StatusBar/EditorCount.tsx',
    ]

    for (const path of startupWidgets) {
      const source = readComponent(path)
      const imports = source
        .split('\n')
        .filter((line) => /^import\s+/.test(line.trim()))
        .join('\n')

      expect(imports, path).not.toContain("from 'antd'")
      expect(imports, path).not.toContain('from "antd"')
    }
  })

  it('does not load the full Ant Design stylesheet in the app entrypoint', () => {
    const source = readFileSync(join(currentDir, '../main.tsx'), 'utf8')

    expect(source).not.toContain("import 'antd/dist/antd.css'")
    expect(source).not.toContain('import "antd/dist/antd.css"')
  })

  it('does not top-level import bookmark UI into the startup sidebar', () => {
    const source = readComponent('SideBar/index.tsx')
    const imports = source
      .split('\n')
      .filter((line) => /^import\s+/.test(line.trim()))
      .join('\n')

    expect(imports).not.toContain('@/extensions/bookmarks')
  })
})
