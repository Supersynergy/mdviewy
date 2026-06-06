import { describe, expect, it } from 'vitest'
import {
  buildAgentHandoffPrompt,
  buildAiContextPack,
  collectInlineSmartReferences,
  extractSmartReferences,
  findSmartReferenceAroundOffset,
  githubUrlForRepoName,
  stripCodeBlocks,
} from './smartActions'

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

  it('detects GitHub owner/repo mentions and ignores local path fragments', () => {
    const refs = extractSmartReferences(
      'Use ujjwalkarn/Machine-Learning-Tutorials or nordbyte/rescope, not /Users/master/project.',
    )

    expect(refs).toContainEqual({
      kind: 'github',
      value: 'https://github.com/ujjwalkarn/Machine-Learning-Tutorials',
      label: 'ujjwalkarn/Machine-Learning-Tutorials',
    })
    expect(refs).toContainEqual({
      kind: 'github',
      value: 'https://github.com/nordbyte/rescope',
      label: 'nordbyte/rescope',
    })
    expect(refs.some((ref) => ref.label === 'Users/master')).toBe(false)
    expect(githubUrlForRepoName('nordbyte/rescope')).toBe('https://github.com/nordbyte/rescope')
  })

  it('locates inline path and GitHub tokens around the hovered offset', () => {
    const text = 'Open `~/projects/synapse/tuning.md` and nordbyte/rescope now.'
    const refs = collectInlineSmartReferences(text)

    expect(refs.map((ref) => ref.kind)).toEqual(['path', 'github'])
    expect(findSmartReferenceAroundOffset(text, text.indexOf('rescope'))).toMatchObject({
      kind: 'github',
      value: 'https://github.com/nordbyte/rescope',
    })
    expect(findSmartReferenceAroundOffset(text, text.indexOf('tuning.md'))).toMatchObject({
      kind: 'path',
      value: '~/projects/synapse/tuning.md',
    })
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

  it('builds compact Claude/Codex handoff prompts and limits reference scans early', () => {
    const ctx = {
      path: '/Users/master/project/a.md',
      name: 'a.md',
      workspaceRoot: '/Users/master/project',
    }

    expect(buildAgentHandoffPrompt(ctx, 'claude')).toContain('respect AGENTS.md/CLAUDE.md')
    expect(buildAgentHandoffPrompt(ctx, 'codex')).toContain('leave the worktree clean')
    expect(buildAgentHandoffPrompt(ctx, 'review')).toContain('code-review mode')

    const refs = extractSmartReferences('https://a.test/1 https://b.test/2 https://c.test/3', {
      limit: 2,
    })

    expect(refs).toHaveLength(2)
  })
})
