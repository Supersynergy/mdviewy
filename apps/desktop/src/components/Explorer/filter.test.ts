import { describe, expect, it } from 'vitest'
import type { IFile } from '@/helper/filesys'
import {
  DEFAULT_EXPLORER_FILTER,
  MAX_FILTERED_FILES,
  filterExplorerTree,
  isExplorerFilterActive,
  matchesExplorerFilter,
  type ExplorerFilter,
} from './filter'

const file = (id: string, name: string, path = `/root/${name}`): IFile => ({
  id,
  name,
  path,
  kind: 'file',
})

const dir = (id: string, name: string, children: IFile[] = []): IFile => ({
  id,
  name,
  path: `/root/${name}`,
  kind: 'dir',
  children,
})

describe('explorer filter', () => {
  it('defaults to showing all non-hidden files', () => {
    expect(DEFAULT_EXPLORER_FILTER.scope).toBe('all')
    expect(isExplorerFilterActive(DEFAULT_EXPLORER_FILTER)).toBe(false)
    expect(matchesExplorerFilter(file('txt', 'notes.txt'), DEFAULT_EXPLORER_FILTER)).toBe(true)
    expect(matchesExplorerFilter(file('hidden', '.env'), DEFAULT_EXPLORER_FILTER)).toBe(false)
  })

  it('filters markdown and custom extensions case-insensitively', () => {
    const markdownFilter: ExplorerFilter = { ...DEFAULT_EXPLORER_FILTER, scope: 'md' }
    const customFilter: ExplorerFilter = {
      ...DEFAULT_EXPLORER_FILTER,
      scope: 'custom',
      customExt: 'json, .toml',
    }

    expect(matchesExplorerFilter(file('mdx', 'Guide.MDX'), markdownFilter)).toBe(true)
    expect(matchesExplorerFilter(file('txt', 'Guide.txt'), markdownFilter)).toBe(false)
    expect(matchesExplorerFilter(file('json', 'settings.JSON'), customFilter)).toBe(true)
    expect(matchesExplorerFilter(file('toml', 'Cargo.toml'), customFilter)).toBe(true)
  })

  it('keeps root while removing hidden folders and empty filtered branches', () => {
    const tree = [
      dir('root', 'root', [
        dir('docs', 'docs', [file('readme', 'README.md'), file('todo', 'todo.txt')]),
        dir('hidden-dir', '.git', [file('config', 'config')]),
        dir('empty', 'empty', [file('notes', 'notes.txt')]),
      ]),
    ]
    const filter: ExplorerFilter = { ...DEFAULT_EXPLORER_FILTER, scope: 'md' }

    const filtered = filterExplorerTree(tree, filter)

    expect(filtered?.[0]?.children?.map((child) => child.name)).toEqual(['docs'])
    expect(filtered?.[0]?.children?.[0]?.children?.map((child) => child.name)).toEqual([
      'README.md',
    ])
    expect(tree[0].children?.map((child) => child.name)).toEqual(['docs', '.git', 'empty'])
  })

  it('can match folders by search query without keeping every sibling folder', () => {
    const tree = [
      dir('root', 'root', [
        dir('flows', 'flows', [file('flow-a', 'daily.md', '/root/flows/daily.md')]),
        dir('docs', 'docs', [file('readme', 'README.md')]),
      ]),
    ]
    const filter: ExplorerFilter = { ...DEFAULT_EXPLORER_FILTER, query: 'flow' }

    const filtered = filterExplorerTree(tree, filter)

    expect(filtered?.[0]?.children?.map((child) => child.name)).toEqual(['flows'])
  })

  it('limits large query result sets before rendering', () => {
    const manyFiles = Array.from({ length: 1600 }, (_, i) => file(`f-${i}`, `flow-${i}.md`))
    const tree = [dir('root', 'root', manyFiles)]
    const filter: ExplorerFilter = { ...DEFAULT_EXPLORER_FILTER, query: 'flow' }

    const filtered = filterExplorerTree(tree, filter)

    expect(filtered?.[0]?.children?.length).toBe(MAX_FILTERED_FILES)
  })
})
