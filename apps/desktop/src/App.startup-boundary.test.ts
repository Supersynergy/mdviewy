import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('App startup boundary', () => {
  it('does not import the broad components barrel', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url))
    const source = readFileSync(join(currentDir, 'App.tsx'), 'utf8')
    const topLevelImports = source
      .split('\n')
      .filter((line) => /^import\s+/.test(line.trim()))
      .join('\n')

    expect(topLevelImports).not.toContain("from './components'")
  })

  it('does not import the router barrel into the app shell', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url))
    const source = readFileSync(join(currentDir, 'App.tsx'), 'utf8')
    const topLevelImports = source
      .split('\n')
      .filter((line) => /^import\s+/.test(line.trim()))
      .join('\n')

    expect(topLevelImports).not.toContain("from '@/router'")
  })
})
