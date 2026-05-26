import { RIGHTBARITEMKEYS } from '@/constants'
import smartActionsExtension from '@/extensions/smart-actions'
import classNames from 'classnames'
import { lazy, memo, Suspense, useState } from 'react'
import { Tooltip } from 'zens'
import { Container as SideBarContainer, SideBarHeader } from './styles'

const LazyTocPanel = lazy(async () => {
  const mod = await import('@/extensions/table-of-content')
  const node = mod.default.components as React.ReactElement
  return { default: () => node }
})

const tocExtensionMeta = {
  title: RIGHTBARITEMKEYS.TableOfContent,
  key: RIGHTBARITEMKEYS.TableOfContent,
  icon: <i className='ri-list-unordered' />,
  components: (
    <Suspense fallback={<div style={{ padding: 12, fontSize: 12, opacity: 0.6 }}>Loading TOC...</div>}>
      <LazyTocPanel />
    </Suspense>
  ),
}

// Lazy: AI chat extension pulls in ant-design/x + sentry + xmarkdown (~MBs).
// Defer until user opens the AI tab — keeps first paint <1s.
const LazyAiPanel = lazy(async () => {
  const mod = await import('@/extensions/ai')
  const node = mod.default.components as React.ReactElement
  return { default: () => node }
})
const aiExtensionMeta = {
  title: RIGHTBARITEMKEYS.AI,
  key: RIGHTBARITEMKEYS.AI,
  icon: <i className='ri-quill-pen-ai-line icon-base' />,
  components: (
    <Suspense fallback={<div style={{ padding: 12, fontSize: 12, opacity: 0.6 }}>Loading AI…</div>}>
      <LazyAiPanel />
    </Suspense>
  ),
}

function RightBar() {
  const [activeRightBarItemKey, setActiveRightBarItemKey] = useState<RIGHTBARITEMKEYS>(
    RIGHTBARITEMKEYS.TableOfContent,
  )

  const rightBarDataSource: RightBarItem[] = [
    tocExtensionMeta,
    smartActionsExtension,
    aiExtensionMeta,
  ]

  // Track which tabs have ever been activated. Only those get mounted —
  // keeps initial right-bar render cheap (AI ext stays unloaded until first
  // open) but once mounted, panels stay alive so their internal state
  // (TOC headings, AI chat history, scroll position) survives tab switches.
  const [everActivated, setEverActivated] = useState<Set<RIGHTBARITEMKEYS>>(
    () => new Set([RIGHTBARITEMKEYS.TableOfContent]),
  )

  const noActiveItem = !activeRightBarItemKey

  return (
    <SideBarContainer noActiveItem={noActiveItem}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
        <SideBarHeader>
          {rightBarDataSource.map((item) => {
            const cls = classNames('icon', 'icon-small', 'icon-smooth', {
              'app-sidebar-active': activeRightBarItemKey === item.key,
              'icon-unselected': activeRightBarItemKey !== item.key
            })

            const handleRightBarItemClick = () => {
              setActiveRightBarItemKey(item.key)
              setEverActivated((prev) => {
                if (prev.has(item.key)) return prev
                const next = new Set(prev)
                next.add(item.key)
                return next
              })
            }

            return (
              <Tooltip key={item.key} title={item.title}>
                <div className={cls} onClick={handleRightBarItemClick}>
                  {item.icon}
                </div>
              </Tooltip>
            )
          })}
        </SideBarHeader>
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          {rightBarDataSource.map((item) => {
            if (!everActivated.has(item.key)) return null
            const isActive = item.key === activeRightBarItemKey
            return (
              <div
                key={item.key}
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: isActive ? 'flex' : 'none',
                  flexDirection: 'column',
                  minHeight: 0,
                }}
              >
                {item.components}
              </div>
            )
          })}
        </div>
      </div>
    </SideBarContainer>
  )
}

export interface RightBarItem {
  title: RIGHTBARITEMKEYS
  key: RIGHTBARITEMKEYS
  icon: React.ReactNode
  components: any
}

export default memo(RightBar)
