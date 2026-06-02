import { describe, expect, it } from 'vitest'
import { buildAiContextPack, extractSmartReferences, stripCodeBlocks } from './smartActions'

describe('smartActions helpers', () => {
  it('extracts urls and mac/local paths without duplicates', () => {
    const refs = extractSmartReferences(
      `Open https://example.com/docs.
See [local](./docs/spec.md), "/Users/master/projects/mdviewy/README.md" and ./docs/spec.md.`,
      {
        currentDir: '/Users/master/projects/mdviewy',
        workspaceRoot: '/Users/master/projects/mdviewy',
      },
    )

    expect(refs).toEqual([
      { kind: 'url', value: 'https://example.com/docs', label: 'example.com/docs' },
      {
        kind: 'path',
        value: '/Users/master/projects/mdviewy/docs/spec.md',
        label: 'spec.md',
      },
      {
        kind: 'path',
        value: '/Users/master/projects/mdviewy/README.md',
        label: 'README.md',
      },
    ])
  })

  it('builds an AI context pack and can hide code blocks', () => {
    const pack = buildAiContextPack(
      {
        path: '/Users/master/project/a.md',
        name: 'a.md',
        workspaceRoot: '/Users/master/project',
        content: 'Text\n\n```ts\nsecretCode()\n```\n',
      },
      { hideCode: true },
    )

    expect(stripCodeBlocks('A\n```js\nx()\n```\nB')).toContain('[code block hidden]')
    expect(pack).toContain('File: /Users/master/project/a.md')
    expect(pack).toContain('Workspace: /Users/master/project')
    expect(pack).toContain('[code block hidden]')
    expect(pack).not.toContain('secretCode')
  })
})
