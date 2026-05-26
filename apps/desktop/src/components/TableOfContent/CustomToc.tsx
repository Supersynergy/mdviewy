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

const stripMd = (s: string) =>
  s
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#+\s*/, '')
    .trim()

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
}

const CustomToc = memo(({ headings, activeId, filterQuery }: Props) => {
  const [flat, setFlat] = useState<FlatHeading[]>([])
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!headings.length) {
      setFlat([])
      return
    }
    const tree = new HeadingTree(headings)
    const arr: FlatHeading[] = []
    tree.traverseInPreorder((node) => {
      if (node.depth < 0) return TraverseResult.Continue
      arr.push({
        chapter: node.chapter,
        title: stripMd(node.title),
        id: node.id,
        depth: node.depth,
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
            h.onClick?.(h.raw)
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
