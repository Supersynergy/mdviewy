import type { IFile } from '@/helper/filesys'
import { useEditorStore } from '@/stores'
import { useVirtualizer } from '@tanstack/react-virtual'
import { memo, useEffect, useMemo, useRef } from 'react'
import styled from 'styled-components'
import { MAX_FILTERED_FILES } from './filter'

const List = styled.div`
  height: 100%;
  overflow: auto;
  padding: 4px 0;
`

const Row = styled.div<{ $active?: boolean }>`
  display: flex;
  flex-direction: column;
  padding: 5px 10px;
  margin: 1px 6px;
  border-radius: 7px;
  cursor: pointer;
  font-size: 0.78rem;
  color: ${(p) => (p.$active ? p.theme.primaryFontColor : p.theme.unselectedFontColor)};
  background: ${(p) => (p.$active ? p.theme.fileTreeSelectedBgColor : 'transparent')};
  transition: background 100ms ease, transform 100ms ease;

  &:hover {
    background: ${(p) => p.theme.fileTreeSelectedBgColor};
    color: ${(p) => p.theme.primaryFontColor};
    transform: translateX(1px);
  }
`

const RowTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  i { font-size: 0.85rem; opacity: 0.75; }
  mark {
    background: ${(p) => p.theme.accentColorFocused};
    color: ${(p) => p.theme.accentColor};
    border-radius: 3px;
    padding: 0 1px;
  }
`

const RowMeta = styled.div`
  font-size: 0.66rem;
  color: ${(p) => p.theme.labelFontColor};
  margin-top: 2px;
  margin-left: 19px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: 'SF Mono', monospace;
  opacity: 0.8;
`

const Header = styled.div`
  padding: 6px 12px 4px;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: ${(p) => p.theme.labelFontColor};
  font-weight: 600;
  display: flex;
  justify-content: space-between;
`

const Empty = styled.div`
  padding: 24px 16px;
  text-align: center;
  color: ${(p) => p.theme.labelFontColor};
  font-size: 0.8rem;
`

const VirtualItems = styled.div`
  position: relative;
`

const FRECENCY_KEY = 'mdmaster.explorer.frecency'

type FrecencyMap = Record<string, { count: number; last: number }>

const loadFrec = (): FrecencyMap => {
  try {
    return JSON.parse(localStorage.getItem(FRECENCY_KEY) || '{}')
  } catch {
    return {}
  }
}

export const bumpFrecency = (path: string) => {
  if (!path) return
  try {
    const cur = loadFrec()
    const entry = cur[path] || { count: 0, last: 0 }
    cur[path] = { count: entry.count + 1, last: Date.now() }
    localStorage.setItem(FRECENCY_KEY, JSON.stringify(cur))
  } catch {}
}

const frecencyScore = (path: string, frec: FrecencyMap) => {
  const e = frec[path]
  if (!e) return 0
  const ageHrs = (Date.now() - e.last) / 3_600_000
  const decay = 1 / (1 + ageHrs / 24)
  return e.count * decay
}

const flatten = (nodes: IFile[]) => {
  const out: IFile[] = []
  const seen = new Set<string>()
  const stack = [...nodes].reverse()

  while (stack.length > 0 && out.length < MAX_FILTERED_FILES) {
    const n = stack.pop()
    if (!n) continue

    if (n.kind === 'file') {
      const key = n.path || n.id
      if (!seen.has(key)) {
        seen.add(key)
        out.push(n)
      }
    }

    if (n.kind === 'dir' && n.children) {
      for (let i = n.children.length - 1; i >= 0; i -= 1) {
        stack.push(n.children[i])
      }
    }
  }

  return out
}

const highlight = (text: string, q: string) => {
  if (!q) return text
  const i = text.toLowerCase().indexOf(q.toLowerCase())
  if (i < 0) return text
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  )
}

const iconForFile = (name?: string) => {
  if (!name) return 'ri-file-line'
  const n = name.toLowerCase()
  if (/\.(md|mdx|markdown)$/.test(n)) return 'ri-markdown-line'
  if (/\.(png|jpe?g|gif|webp|svg|bmp)$/.test(n)) return 'ri-image-line'
  if (/\.(json|jsonc)$/.test(n)) return 'ri-braces-line'
  if (/\.(js|jsx|ts|tsx|mjs)$/.test(n)) return 'ri-code-s-slash-line'
  if (/\.(rs|toml|lock)$/.test(n)) return 'ri-code-s-slash-line'
  if (/\.(py)$/.test(n)) return 'ri-file-code-line'
  if (/\.(yml|yaml|env|sh|zsh|fish)$/.test(n)) return 'ri-terminal-box-line'
  if (/\.(pdf)$/.test(n)) return 'ri-file-pdf-line'
  return 'ri-file-line'
}

type Props = {
  files: IFile[]
  rootPath?: string
  query: string
  onOpen: (file: IFile) => void
}

const FlatResults = memo(({ files, rootPath, query, onOpen }: Props) => {
  const { activeId } = useEditorStore()
  const frec = useMemo(() => loadFrec(), [files])
  const listRef = useRef<HTMLDivElement>(null)
  const sortedRef = useRef<IFile[]>([])
  const sorted = useMemo(() => {
    const flat = flatten(files)
    const q = query.toLowerCase()
    const scored = flat.map((f) => {
      const name = (f.name || '').toLowerCase()
      let s = 0
      if (q && name === q) s = 1000
      else if (q && name.startsWith(q)) s = 800
      else if (q && name.includes(q)) s = 600 - name.indexOf(q)
      else s = 100
      s += frecencyScore(f.path || '', frec) * 50
      return { f, s }
    })
    return scored.sort((a, b) => b.s - a.s).map((x) => x.f)
  }, [files, query, frec])
  const virtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 49,
    overscan: 10,
  })

  useEffect(() => {
    sortedRef.current = sorted
  }, [sorted])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (!e.altKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return
      const list = sortedRef.current
      if (!list.length) return
      e.preventDefault()
      const curId = useEditorStore.getState().activeId
      const idx = Math.max(0, list.findIndex((f) => f.id === curId))
      const delta = e.key === 'ArrowRight' ? 1 : -1
      const next = list[Math.min(Math.max(idx + delta, 0), list.length - 1)]
      if (next) onOpen(next)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onOpen])

  const relPath = (full?: string) => {
    if (!full || !rootPath) return ''
    if (full.startsWith(rootPath)) {
      const rest = full.slice(rootPath.length).replace(/^[/\\]+/, '')
      const parts = rest.split('/')
      parts.pop()
      return parts.join(' / ') || '·'
    }
    return full
  }

  if (sorted.length === 0) {
    return <Empty>No files match</Empty>
  }

  return (
    <List ref={listRef}>
      <Header>
        <span>{sorted.length} files</span>
        <span>sorted by relevance · frecency</span>
      </Header>
      <VirtualItems style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const f = sorted[virtualItem.index]
          if (!f) return null

          return (
            <Row
              key={f.id}
              $active={activeId === f.id}
              onClick={() => onOpen(f)}
              title={f.path}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <RowTitle>
                <i className={iconForFile(f.name)} />
                {highlight(f.name || '', query)}
              </RowTitle>
              <RowMeta>{relPath(f.path)}</RowMeta>
            </Row>
          )
        })}
      </VirtualItems>
    </List>
  )
})

FlatResults.displayName = 'FlatResults'

export default FlatResults
