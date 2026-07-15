import { invoke } from '@tauri-apps/api/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FileResultCode, readDirectory } from './filesys'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))

const invokeMock = vi.mocked(invoke)

describe('readDirectory', () => {
  beforeEach(() => invokeMock.mockReset())

  it('rejects native errors instead of leaving the open request pending', async () => {
    invokeMock.mockResolvedValueOnce({
      code: FileResultCode.TooLarge,
      content: 'Choose a smaller workspace.',
    })

    await expect(readDirectory('/too-large')).rejects.toThrow('Choose a smaller workspace.')
  })

  it('hydrates a bounded native tree with stable UI ids', async () => {
    invokeMock
      .mockResolvedValueOnce({
        code: FileResultCode.Success,
        content: JSON.stringify([
          { name: 'README.md', kind: 'file', path: '/docs/README.md', ext: 'md' },
        ]),
      })
      .mockResolvedValueOnce('docs')

    const [root] = await readDirectory('/docs')

    expect(root.name).toBe('docs')
    expect(root.children?.[0]).toMatchObject({ name: 'README.md', kind: 'file' })
    expect(root.children?.[0].id).toEqual(expect.any(String))
  })
})
