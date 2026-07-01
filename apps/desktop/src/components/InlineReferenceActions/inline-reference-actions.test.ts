import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const currentDir = dirname(fileURLToPath(import.meta.url))
const componentSource = readFileSync(join(currentDir, 'InlineReferenceActions.tsx'), 'utf8')
const appSource = readFileSync(join(currentDir, '../../App.tsx'), 'utf8')
const githubIcon = 'ri-' + 'github-fill'
const linksIcon = 'ri-' + 'links-line'

describe('InlineReferenceActions wiring', () => {
  it('mounts one global markdown reference action layer', () => {
    expect(appSource).toContain('<InlineReferenceActions />')
    expect(componentSource).toContain("const MARKDOWN_SCOPE = '.markdown-body'")
    expect(componentSource).toContain('data-inline-reference-actions')
  })

  it('detects text-node repo/path tokens without mutating markdown content', () => {
    expect(componentSource).toContain('findSmartReferenceAroundOffset')
    expect(componentSource).toContain('createRangeFromPoint')
    expect(componentSource).toContain('document.createRange()')
    expect(componentSource).not.toContain('innerHTML')
  })

  it('offers compact hover actions for local paths only', () => {
    expect(componentSource).toContain('Open folder')
    expect(componentSource).toContain('Open containing folder')
    expect(componentSource).toContain('Copy path')
    expect(componentSource).toContain('ri-folder-open-line')
    expect(componentSource).toContain('ri-file-copy-line')
    expect(componentSource).toContain("const isPathRef = (ref: InlineSmartReference) => ref.kind === 'path'")
    expect(componentSource).not.toContain('Open GitHub repository')
    expect(componentSource).not.toContain('Open URL')
    expect(componentSource).not.toContain('Copy URL')
    expect(componentSource).not.toContain('Copy Markdown link')
    expect(componentSource).not.toContain(githubIcon)
    expect(componentSource).not.toContain(linksIcon)
  })

  it('resolves folder paths before rendering the first path action', () => {
    expect(componentSource).toContain("invoke<boolean>('is_dir'")
    expect(componentSource).toContain("type PathTargetKind = 'file' | 'folder' | 'unknown'")
    expect(componentSource).toContain("pathTargetKind === 'folder'")
    expect(componentSource).toContain("label: 'Open folder'")
  })
})
