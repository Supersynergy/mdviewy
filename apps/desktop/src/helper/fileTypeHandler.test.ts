import { beforeEach, describe, expect, it } from 'vitest'
import useAppSettingStore from '@/stores/useAppSettingStore'
import type { IFile } from './filesys'
import { getFileTypeConfig, isTextfileType } from './fileTypeHandler'

const file = (path: string): IFile =>
  ({ name: path.split('/').pop(), path, id: 'x', kind: 'file' }) as unknown as IFile

describe('getFileTypeConfig', () => {
  beforeEach(() => {
    useAppSettingStore.setState({ settingData: {} } as any)
  })

  it('keeps markdown as a three-mode document', () => {
    const cfg = getFileTypeConfig(file('/x/note.md'))
    expect(cfg.type).toBe('markdown')
    expect(cfg.supportedModes).toContain('wysiwyg')
  })

  it('routes code files to the source editor', () => {
    for (const p of ['/x/a.py', '/x/b.tsx', '/x/c.rs', '/x/d.yaml', '/x/e.css']) {
      const cfg = getFileTypeConfig(file(p))
      expect(cfg.type).toBe('text')
      expect(cfg.defaultMode).toBe('sourceCode')
      expect(isTextfileType(cfg)).toBe(true)
    }
  })

  it('opens rtf as preview with a source fallback', () => {
    const cfg = getFileTypeConfig(file('/x/letter.rtf'))
    expect(cfg.type).toBe('rtf')
    expect(cfg.defaultMode).toBe('preview')
    expect(cfg.supportedModes).toContain('sourceCode')
    expect(isTextfileType(cfg)).toBe(false)
  })

  it('opens pdf preview-only', () => {
    const cfg = getFileTypeConfig(file('/x/paper.pdf'))
    expect(cfg.type).toBe('pdf')
    expect(cfg.defaultMode).toBe('preview')
  })

  it('recognizes more image types than before', () => {
    for (const p of ['/x/a.webp', '/x/b.avif', '/x/c.tiff']) {
      expect(getFileTypeConfig(file(p)).type).toBe('image')
    }
  })

  it('treats dotfiles and extensionless scripts as text', () => {
    expect(getFileTypeConfig(file('/x/.gitignore')).type).toBe('text')
    expect(getFileTypeConfig(file('/x/Dockerfile')).type).toBe('text')
    expect(getFileTypeConfig(file('/x/Makefile')).type).toBe('text')
  })

  it('leaves genuinely unknown extensions unsupported', () => {
    expect(getFileTypeConfig(file('/x/blob.exe')).type).toBe('unsupported')
    expect(getFileTypeConfig(file('/x/archive.tar.gz')).type).toBe('unsupported')
  })
})
