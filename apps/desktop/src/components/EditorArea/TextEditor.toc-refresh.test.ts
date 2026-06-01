import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(join(__dirname, 'TextEditor.tsx'), 'utf8')

describe('TextEditor ToC refresh timing', () => {
  it('refreshes only for the active file and retries after content/editor mount races', () => {
    expect(source).toContain('const refreshTocSoon = useCallback')
    expect(source).toContain('useEditorStore.getState().activeId !== id')
    expect(source).toContain("execute('app:toc_refresh')")
    expect(source).toContain('requestAnimationFrame(run)')
    expect(source).toContain('[40, 120, 300]')
  })
})
