import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

function readViteConfig() {
  const currentDir = dirname(fileURLToPath(import.meta.url))

  return readFileSync(join(currentDir, '../vite.config.ts'), 'utf8')
}

describe('vite startup chunking', () => {
  it('does not place unmatched node_modules into an eager shared vendor chunk', () => {
    expect(readViteConfig()).not.toContain("return 'vendor'")
  })

  it('does not manually chunk lazy feature packages into app-shell dependencies', () => {
    const source = readViteConfig()

    expect(source).not.toContain('vendor-editor')
    expect(source).not.toContain('vendor-diagrams')
    expect(source).not.toContain('vendor-ai')
    expect(source).not.toContain('vendor-ui')
  })

  it('keeps transitive lodash out of monolithic feature chunks', () => {
    expect(readViteConfig()).toContain('vendor-lodash')
  })
})
