import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('aiProvidersService startup boundary', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url))
  const topLevelImports = (relativePath: string) => {
    const source = readFileSync(join(currentDir, relativePath), 'utf8')
    return (source.match(/^import\s+(?:[\s\S]*?)from\s+['"][^'"]+['"]|^import\s+['"][^'"]+['"]/gm) ?? [])
      .filter((statement) => !/^import\s+type\b/.test(statement.trim()))
      .join('\n')
  }

  it('keeps heavy AI SDKs out of top-level imports', () => {
    const imports = topLevelImports('aiProvidersService.ts')

    expect(imports).not.toMatch(/@ai-sdk\//)
    expect(imports).not.toMatch(/from ['"]ai['"]/)
    expect(imports).not.toMatch(/ollama-ai-provider-v2/)
  })

  it('keeps request execution code out of the startup chat store imports', () => {
    const imports = topLevelImports('useAiChatStore.ts')

    expect(imports).not.toContain('@/extensions/ai/api')
    expect(imports).not.toContain("from './aiProvidersService'")
  })

  it('keeps request execution code out of eager editor delegate imports', () => {
    const imports = topLevelImports('../../components/EditorArea/createWysiwygDelegateOptions.ts')

    expect(imports).not.toContain('@/extensions/ai/api')
    expect(imports).not.toContain('@/extensions/ai/aiProvidersService')
  })

  it('keeps the lazy request API off broad helper barrels', () => {
    const imports = topLevelImports('api.ts')

    expect(imports).not.toContain("from '@/helper'")
  })
})
