import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('CommandPalette accessibility contract', () => {
  it('exposes the palette as a dialog with semantic search and results', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url))
    const source = readFileSync(join(currentDir, 'index.tsx'), 'utf8')
    const styles = readFileSync(join(currentDir, 'styles.ts'), 'utf8')

    expect(source).toContain("role='dialog'")
    expect(source).toContain("aria-modal='true'")
    expect(source).toContain("aria-label='Command palette search'")
    expect(source).toContain("aria-label='Close command palette'")
    expect(source).toContain("role='listbox'")
    expect(source).toContain("role='option'")
    expect(source).toContain('aria-selected={i === activeIdx}')

    expect(styles).toContain('export const CloseButton = styled.button')
    expect(styles).toContain('export const Item = styled.button')
  })
})
