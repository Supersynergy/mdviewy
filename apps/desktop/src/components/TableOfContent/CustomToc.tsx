import { memo, useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import { HeadingTree, IHeadingData, TraverseResult } from './HeadingTree'

const Wrap = styled.div`
  height: 100%;
  overflow: auto;
  padding: 4px 6px 12px;
`

type RowProps = { $depth: number; $active?: boolean }

const Row = styled.a<RowProps>`
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 4px 8px 4px ${(p) => 8 + p.$depth * 14}px;
  text-decoration: none;
  border-radius: 6px;
  font-size: 0.78rem;
  line-height: 1.35;
  color: ${(p) => (p.$active ? p.theme.primaryFontColor : p.theme.labelFontColor)};
  background: ${(p) => (p.$active ? p.theme.accentColorFocused : 'transparent')};
  font-weight: ${(p) => (p.$active ? 600 : 400)};
  cursor: pointer;
  transition: background 100ms ease, color 100ms ease, transform 100ms ease;
  border-left: 2px solid ${(p) => (p.$active ? p.theme.accentColor : 'transparent')};

  &:hover {
    background: ${(p) => p.theme.hoverColor};
    color: ${(p) => p.theme.primaryFontColor};
    transform: translateX(1px);
  }
`

const Chapter = styled.span`
  flex-shrink: 0;
  min-width: 32px;
  font-family: 'SF Mono', monospace;
  font-size: 0.7rem;
  color: ${(p) => p.theme.accentColor};
  font-weight: 600;
`

const Title = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
`

const Empty = styled.div`
  padding: 32px 16px;
  text-align: center;
  color: ${(p) => p.theme.labelFontColor};
  font-size: 0.8rem;
  opacity: 0.7;
`

const stripMd = (s: string): string => {
  if (!s) return ''
  return s
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')      // images ![alt](url) → alt
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')       // links [text](url) → text
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')      // ref links [text][id] → text
    .replace(/<[^>]+>/g, '')                       // html tags
    .replace(/\*\*([^*]+)\*\*/g, '$1')             // **bold**
    .replace(/__([^_]+)__/g, '$1')                 // __bold__
    .replace(/\*([^*]+)\*/g, '$1')                 // *italic*
    .replace(/_([^_]+)_/g, '$1')                   // _italic_
    .replace(/~~([^~]+)~~/g, '$1')                 // ~~strike~~
    .replace(/`([^`]+)`/g, '$1')                   // `code`
    .replace(/\\([\\`*_{}[\]()#+\-.!~])/g, '$1')   // escaped chars
    .replace(/^#+\s*/, '')                         // leading #
    .replace(/\s+/g, ' ')                          // collapse whitespace
    .trim()
}

type FlatHeading = {
  chapter: string
  title: string
  id: string
  depth: number
  onClick?: (h: IHeadingData) => void
  raw: IHeadingData
}

type Props = {
  headings: IHeadingData[]
  activeId?: string | null
  filterQuery?: string
  onSelectHeading?: (id: string) => void
}

const CustomToc = memo(({ headings, activeId, filterQuery, onSelectHeading }: Props) => {
  const [flat, setFlat] = useState<FlatHeading[]>([])
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!headings.length) {
      setFlat([])
      return
    }
    let tree: HeadingTree
    try {
      tree = new HeadingTree(headings)
    } catch (err) {
      console.warn('[CustomToc] HeadingTree build failed', err)
      setFlat([])
      return
    }
    const arr: FlatHeading[] = []
    const seen = new Map<string, number>()
    tree.traverseInPreorder((node) => {
      if (node.depth < 0) return TraverseResult.Continue
      const baseId = node.id || `${node.chapter}-${node.title}`.replace(/\s+/g, '-').toLowerCase()
      const count = seen.get(baseId) ?? 0
      seen.set(baseId, count + 1)
      const id = count === 0 ? baseId : `${baseId}-${count}`
      arr.push({
        chapter: node.chapter,
        title: stripMd(node.title),
        id,
        depth: Math.max(0, node.depth),
        onClick: node.onClick,
        raw: node.h,
      })
      return TraverseResult.Continue
    })
    setFlat(arr)
  }, [headings])

  const visible = useMemo(() => {
    if (!filterQuery) return flat
    const q = filterQuery.toLowerCase()
    return flat.filter((h) => h.title.toLowerCase().includes(q) || h.chapter.includes(q))
  }, [flat, filterQuery])

  useEffect(() => {
    if (!activeId) return
    const el = wrapRef.current?.querySelector(`[data-toc-id="${activeId}"]`) as HTMLElement | null
    if (el) {
      const rect = el.getBoundingClientRect()
      const wrapRect = wrapRef.current?.getBoundingClientRect()
      if (wrapRect && (rect.top < wrapRect.top || rect.bottom > wrapRect.bottom)) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
    }
  }, [activeId])

  if (visible.length === 0) {
    return (
      <Wrap ref={wrapRef}>
        <Empty>{filterQuery ? 'No heading matches' : 'No headings yet'}</Empty>
      </Wrap>
    )
  }

  return (
    <Wrap ref={wrapRef}>
      {visible.map((h) => (
        <Row
          key={h.id}
          data-toc-id={h.id}
          $depth={h.depth}
          $active={activeId === h.id}
          onClick={(e) => {
            e.preventDefault()
            onSelectHeading?.(h.id)
            try {
              if (h.onClick) {
                h.onClick(h.raw)
              } else {
                const target =
                  document.getElementById(h.id) ||
                  (document.querySelector(`[data-heading-id="${h.id}"]`) as HTMLElement | null)
                target?.scrollIntoView({ behavior: 'auto', block: 'start' })
              }
            } catch (err) {
              console.warn('[CustomToc] onClick handler threw', err)
            }
            window.setTimeout(() => onSelectHeading?.(h.id), 120)
            window.setTimeout(() => onSelectHeading?.(h.id), 320)
          }}
        >
          <Chapter>{h.chapter}</Chapter>
          <Title title={h.title}>{h.title}</Title>
        </Row>
      ))}
    </Wrap>
  )
})

CustomToc.displayName = 'CustomToc'

export default CustomToc
