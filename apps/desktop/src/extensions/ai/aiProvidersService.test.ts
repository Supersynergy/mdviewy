import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('aiProvidersService startup boundary', () => {
  it('keeps heavy AI SDKs out of top-level imports', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url))
    const source = readFileSync(join(currentDir, 'aiProvidersService.ts'), 'utf8')
    const topLevelImports = source
      .split('\n')
      .filter((line) => /^import\s+(?!type\b)/.test(line.trim()))
      .join('\n')

    expect(topLevelImports).not.toMatch(/@ai-sdk\//)
    expect(topLevelImports).not.toMatch(/from ['"]ai['"]/)
    expect(topLevelImports).not.toMatch(/ollama-ai-provider-v2/)
  })
})
