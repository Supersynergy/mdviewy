import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const currentDir = dirname(fileURLToPath(import.meta.url))

const readSource = (relativePath: string) =>
  readFileSync(join(currentDir, relativePath), 'utf8')

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
})
