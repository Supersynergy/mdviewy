import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const currentDir = dirname(fileURLToPath(import.meta.url))

const readComponent = (relativePath: string) =>
  readFileSync(join(currentDir, relativePath), 'utf8')

const collectUsedRemixIconClasses = (source: string) =>
  [...source.matchAll(/(?<![a-zA-Z0-9])ri-[a-z0-9-]+/g)]
    .map((match) => match[0])
    .filter((icon) => icon !== 'ri-')

const listSourceFiles = (dir: string): string[] => {
  const entries = readdirSync(dir)

  return entries.flatMap((entry) => {
    const path = join(dir, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) return listSourceFiles(path)
    if (entry === 'remixicon-subset.css') return []
    if (/\.(ts|tsx|css)$/.test(entry)) return [path]
    return []
  })
}

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

  it('does not statically load error reporting in the app entrypoint', () => {
    const source = readFileSync(join(currentDir, '../main.tsx'), 'utf8')
    const imports = source
      .split('\n')
      .filter((line) => /^import\s+/.test(line.trim()))
      .join('\n')

    expect(imports).not.toContain('@sentry/react')
    expect(source).not.toContain('Sentry.init(')
  })

  it('does not top-level import bookmark UI into the startup sidebar', () => {
    const source = readComponent('SideBar/index.tsx')
    const imports = source
      .split('\n')
      .filter((line) => /^import\s+/.test(line.trim()))
      .join('\n')

    expect(imports).not.toContain('@/extensions/bookmarks')
  })

  it('uses a Remixicon subset instead of the full icon stylesheet', () => {
    const mainSource = readFileSync(join(currentDir, '../main.tsx'), 'utf8')
    const subsetSource = readFileSync(join(currentDir, '../remixicon-subset.css'), 'utf8')
    const srcDir = join(currentDir, '..')
    const usedIcons = new Set(
      listSourceFiles(srcDir).flatMap((path) =>
        collectUsedRemixIconClasses(readFileSync(path, 'utf8')),
      ),
    )

    expect(mainSource).not.toContain("remixicon/fonts/remixicon.css")
    expect(mainSource).toContain("import './remixicon-subset.css'")
    expect(subsetSource).toContain('remixicon.woff2')
    expect(subsetSource).not.toContain('remixicon.eot')
    expect(subsetSource).not.toContain('remixicon.woff?')
    expect(subsetSource).not.toContain('remixicon.ttf')
    expect(subsetSource).not.toContain('remixicon.svg')

    for (const icon of usedIcons) {
      expect(subsetSource, icon).toContain(`.${icon}:before`)
    }
  })
})
