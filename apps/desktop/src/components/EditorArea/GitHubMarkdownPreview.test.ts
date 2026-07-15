import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'styled-components'
import { describe, expect, it, vi } from 'vitest'
import {
  GitHubMarkdownPreview,
  githubHeadingId,
  requiresSourceSafeEditing,
  resolveReadmeAsset,
} from './GitHubMarkdownPreview'

vi.mock('@tauri-apps/api/core', () => ({
  convertFileSrc: (path: string) => `asset://localhost/${encodeURIComponent(path)}`,
}))

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

describe('GitHub Markdown preview helpers', () => {
  it('resolves README assets without leaving the document folder accidentally', () => {
    expect(resolveReadmeAsset('/work/project/README.md', './public/logo.png')).toBe(
      '/work/project/public/logo.png',
    )
    expect(resolveReadmeAsset('/work/project/docs/README.md', '../logo.png')).toBe(
      '/work/project/logo.png',
    )
  })

  it('leaves web URLs untouched', () => {
    expect(resolveReadmeAsset('/work/README.md', 'https://img.shields.io/test.svg')).toBe(
      'https://img.shields.io/test.svg',
    )
  })

  it('creates GitHub-style heading anchors', () => {
    expect(githubHeadingId('Hello, GitHub README!')).toBe('hello-github-readme')
  })

  it('protects GitHub-only constructs from lossy WYSIWYG editing', () => {
    expect(requiresSourceSafeEditing('<details><summary>More</summary></details>')).toBe(true)
    expect(requiresSourceSafeEditing('> [!NOTE]\n> Read this')).toBe(true)
    expect(requiresSourceSafeEditing('# Plain Markdown')).toBe(false)
  })

  it('renders a GitHub README fixture and sanitizes hostile HTML', async () => {
    const fixture = `# Project

| State | Value |
| :--- | ---: |
| Ready | 1 |

- [X] shipped

<details><summary>More</summary>Safe content</details>

> [!NOTE]
> Alert content

<img src="./logo.png" alt="Logo" onerror="alert(1)">
<script>alert('no')</script>`
    const container = document.createElement('div')
    const root = createRoot(container)
    await act(async () => {
      root.render(
        createElement(
          ThemeProvider,
          { theme: { accentColor: '#166870', borderColor: '#d0d7de' } },
          createElement(GitHubMarkdownPreview, {
            content: fixture,
            filePath: '/project/README.md',
          }),
        ),
      )
    })
    const html = container.innerHTML

    expect(html).toContain('<table>')
    expect(html).toContain('type="checkbox"')
    expect(html).toContain('<details>')
    expect(html).toContain('markdown-alert-note')
    expect(html).toContain('Alert content')
    expect(html).toContain('asset://localhost/%2Fproject%2Flogo.png')
    expect(html).not.toContain('onerror')
    expect(html).not.toContain('<script')
    await act(async () => root.unmount())
  })
})
