import Explorer from '@/components/Explorer'
import { RIGHTBARITEMKEYS } from '@/constants'
import classNames from 'classnames'
import { lazy, memo, Suspense, useMemo, useState } from 'react'
import { Tooltip } from 'zens'
import { Container as SideBarContainer, SideBarHeader } from './styles'

const LazyBookMarksPanel = lazy(async () => {
  const mod = await import('@/extensions/bookmarks')
  const node = mod.default.components as React.ReactElement
  return { default: () => node }
})

const BookMarks = {
  title: RIGHTBARITEMKEYS.BookMarks,
  key: RIGHTBARITEMKEYS.BookMarks,
  icon: <i className='ri-bookmark-line' />,
  components: (
    <Suspense fallback={<div style={{ padding: 12, fontSize: 12, opacity: 0.6 }}>Loading bookmarks...</div>}>
      <LazyBookMarksPanel />
    </Suspense>
  ),
}

const SearchTrigger = {
  title: RIGHTBARITEMKEYS.Search,
  key: RIGHTBARITEMKEYS.Search,
  icon: <i className='ri-search-2-line' />,
  onClick: () =>
    window.dispatchEvent(new CustomEvent('mf:cmd_palette:open', { detail: 'content' })),
}

function SideBar() {
  const [activeRightBarItemKey, setActiveRightBarItemKey] = useState<RIGHTBARITEMKEYS>(
    RIGHTBARITEMKEYS.Explorer,
  )

  const leftBarDataSource: RightBarItem[] = useMemo(() => {
    return [
      {
        title: RIGHTBARITEMKEYS.Explorer,
        key: RIGHTBARITEMKEYS.Explorer,
        icon: <i className='ri-file-list-3-line' />,
        components: <Explorer />,
      },
      BookMarks,
    ]
  }, [])

  const activeRightBarItem = useMemo(() => {
    const activeItem = leftBarDataSource.find((item) => item.key === activeRightBarItemKey)
    return activeItem
  }, [activeRightBarItemKey, leftBarDataSource])

  const noActiveItem = !activeRightBarItemKey

  return (
    <SideBarContainer noActiveItem={noActiveItem}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
        <SideBarHeader>
          {leftBarDataSource.map((item) => {
            const cls = classNames('icon', 'icon-small', 'icon-smooth', {
              'app-sidebar-active': activeRightBarItemKey === item.key,
              'icon-unselected': activeRightBarItemKey !== item.key
            })

            const handleRightBarItemClick = () => {
              setActiveRightBarItemKey(item.key)
            }

            return (
              <Tooltip key={item.key} title={item.title}>
                <div className={cls} onClick={handleRightBarItemClick}>
                  {item.icon}
                </div>
              </Tooltip>
            )
          })}
          <Tooltip title='Search (Cmd+Shift+F)'>
            <div
              className='icon icon-small icon-smooth icon-unselected'
              onClick={SearchTrigger.onClick}
            >
              {SearchTrigger.icon}
            </div>
          </Tooltip>
        </SideBarHeader>
        {activeRightBarItem?.components ?? null}
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

export default memo(SideBar)
