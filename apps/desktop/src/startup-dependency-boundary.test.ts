import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const currentDir = dirname(fileURLToPath(import.meta.url))

const readSource = (relativePath: string) =>
  readFileSync(join(currentDir, relativePath), 'utf8')

const listSourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      return listSourceFiles(fullPath)
    }

    return /\.(ts|tsx)$/.test(entry) ? [fullPath] : []
  })

const topLevelImports = (source: string) =>
  source
    .split('\n')
    .filter((line) => /^import\s+/.test(line.trim()))
    .join('\n')

describe('startup dependency boundary', () => {
  it('keeps lodash out of app-shell startup modules', () => {
    const startupSources = [
      './hooks/useAppSetup.ts',
      './stores/useTasksStore.ts',
      './extensions/ai/useAiChatStore.ts',
    ]

    for (const sourcePath of startupSources) {
      expect(topLevelImports(readSource(sourcePath)), sourcePath).not.toContain("from 'lodash'")
    }
  })

  it('keeps lodash out of first-party desktop source imports', () => {
    const sourceFiles = listSourceFiles(currentDir)

    for (const sourcePath of sourceFiles) {
      const imports = topLevelImports(readFileSync(sourcePath, 'utf8'))
      expect(imports, sourcePath).not.toContain("from 'lodash'")
      expect(imports, sourcePath).not.toContain('from "lodash"')
    }
  })

  it('does not keep lodash as a direct desktop dependency', () => {
    const packageJson = JSON.parse(readFileSync(join(currentDir, '../package.json'), 'utf8'))

    expect(packageJson.dependencies).not.toHaveProperty('lodash')
    expect(packageJson.devDependencies).not.toHaveProperty('@types/lodash')
  })
})
