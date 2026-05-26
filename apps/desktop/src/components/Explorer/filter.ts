import type { IFile } from '@/helper/filesys'

export type ExplorerFilter = {
  scope: 'md' | 'all' | 'custom'
  customExt: string
  query: string
  hideHidden: boolean
  flat: boolean
}

export const DEFAULT_EXPLORER_FILTER: ExplorerFilter = {
  scope: 'all',
  customExt: '.md,.mdx,.markdown',
  query: '',
  hideHidden: true,
  flat: false,
}

export const MAX_FILTERED_FILES = 1500
export const MAX_FILTER_QUERY_LENGTH = 120

const isHiddenNode = (file: IFile) => (file.name || '').startsWith('.')

export const normalizeFilterQuery = (query: unknown): string => {
  return typeof query === 'string' ? query.slice(0, MAX_FILTER_QUERY_LENGTH) : ''
}

export const isExplorerFilterActive = (filter: ExplorerFilter): boolean => {
  return normalizeFilterQuery(filter.query).trim() !== '' || filter.scope !== 'all'
}

export const matchesExplorerFilter = (file: IFile, filter: ExplorerFilter): boolean => {
  if (filter.hideHidden && isHiddenNode(file)) return false

  const name = (file.name || '').toLowerCase()
  const query = normalizeFilterQuery(filter.query).trim().toLowerCase()

  if (file.kind !== 'file') return !query || name.includes(query)

  if (query && !name.includes(query)) return false
  if (filter.scope === 'all') return true
  if (filter.scope === 'md') return /\.(md|mdx|markdown)$/i.test(name)

  if (filter.scope === 'custom') {
    const exts = filter.customExt
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)

    if (!exts.length) return true
    return exts.some((ext) => name.endsWith(ext.startsWith('.') ? ext : `.${ext}`))
  }

  return true
}

type FilterState = {
  limit: number
  files: number
}

const pushMatchedFile = (out: IFile[], node: IFile, state: FilterState) => {
  if (state.files >= state.limit) return
  out.push(node)
  state.files += 1
}

const filterChildren = (nodes: IFile[], filter: ExplorerFilter, state: FilterState): IFile[] => {
  const out: IFile[] = []
  const query = normalizeFilterQuery(filter.query).trim()
  const active = isExplorerFilterActive(filter)

  for (const node of nodes) {
    if (state.files >= state.limit) break
    if (filter.hideHidden && isHiddenNode(node)) continue

    if (node.kind === 'dir') {
      const children = filterChildren(node.children || [], filter, state)
      if (children.length > 0 || !active || (query && matchesExplorerFilter(node, filter))) {
        out.push({ ...node, children })
      }
      continue
    }

    if (matchesExplorerFilter(node, filter)) {
      pushMatchedFile(out, node, state)
    }
  }

  return out
}

export const filterExplorerTree = (
  nodes: IFile[] | null,
  filter: ExplorerFilter,
): IFile[] | null => {
  if (!nodes || nodes.length === 0) return nodes

  const query = normalizeFilterQuery(filter.query).trim()
  const state: FilterState = {
    limit: query ? MAX_FILTERED_FILES : Number.POSITIVE_INFINITY,
    files: 0,
  }
  const [root, ...rest] = nodes
  const filteredRoot =
    root.kind === 'dir'
      ? { ...root, children: filterChildren(root.children || [], filter, state) }
      : root

  return [filteredRoot, ...filterChildren(rest, filter, state)]
}
