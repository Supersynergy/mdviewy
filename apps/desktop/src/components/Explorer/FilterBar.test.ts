import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadFilter } from './FilterBar'

const STORAGE_KEY = 'mdmaster.explorer.filter'

describe('explorer filter persistence', () => {
  let store: Record<string, string>

  beforeEach(() => {
    store = {}
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value
      },
      clear: () => {
        store = {}
      },
      removeItem: (key: string) => {
        delete store[key]
      },
    })
    localStorage.clear()
  })

  it('migrates the legacy markdown-only default back to all files', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        scope: 'md',
        customExt: '.md,.mdx,.markdown',
        query: '',
        hideHidden: true,
        flat: false,
      }),
    )

    expect(loadFilter().scope).toBe('all')
  })

  it('keeps a deliberate markdown filter but drops stale query on startup', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        scope: 'md',
        customExt: '.md,.mdx,.markdown',
        query: 'readme',
        hideHidden: true,
        flat: false,
      }),
    )

    expect(loadFilter()).toMatchObject({ scope: 'md', query: '' })
  })

  it('normalizes invalid persisted filter data', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        scope: 'bad',
        customExt: 42,
        query: { nested: true },
        hideHidden: 'yes',
        flat: 'no',
      }),
    )

    expect(loadFilter()).toMatchObject({
      scope: 'all',
      customExt: '.md,.mdx,.markdown',
      query: '',
      hideHidden: true,
      flat: false,
    })
  })
})
