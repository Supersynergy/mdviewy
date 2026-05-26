import { Empty, FileTree, List } from '@/components'
import type { IFile } from '@/helper/filesys'
import { useOpen } from '@/hooks'
import { createNewWindow } from '@/services/windows'
import { useEditorStore } from '@/stores'
import useOpenedCacheStore from '@/stores/useOpenedCacheStore'
import { homeDir } from '@tauri-apps/api/path'
import { Popover } from 'antd'
import classNames from 'classnames'
import type { FC, MouseEventHandler } from 'react'
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import type { ListDataItem } from '../ui-v2/List'
import FilterBar, { loadFilter } from './FilterBar'
import { filterExplorerTree, type ExplorerFilter } from './filter'
import FlatResults, { bumpFrecency } from './FlatResults'
import { Container } from './styles'

const RecentListBottom = styled.div`
  padding: 4px 8px;
  font-size: 0.7rem;
  cursor: pointer;
  text-align: center;
  color: ${(props) => props.theme.labelFontColor};

  &:hover {
    background-color: ${(props) => props.theme.tipsBgColor};
  }
`

const shortenPath = (path: string, homePath: string) => {
  if (!homePath) return path
  if (path === homePath) return '~'
  if (path.startsWith(homePath)) {
    const nextChar = path[homePath.length]
    if (nextChar === '/' || nextChar === '\\') {
      return `~${path.slice(homePath.length)}`
    }
  }
  return path
}

const getFolderName = (path: string) => {
  if (!path) return ''
  // Remove trailing separator if exists
  const normalized = path.replace(/[/\\]$/, '')
  const match = normalized.match(/[^/\\]+$/)
  return match ? match[0] : normalized
}

const Explorer: FC<ExplorerProps> = (props) => {
  const { t } = useTranslation()
  const { folderData, activeId, addOpenedFile, setActiveId } = useEditorStore()
  const { recentWorkspaces, clearRecentWorkspaces } = useOpenedCacheStore()
  const { openFolderDialog, openFolder } = useOpen()
  const [dndRootElement, setDndRootElement] = useState<HTMLDivElement | null>(null)
  const [homePath, setHomePath] = useState<string>('')
  const [filter, setFilter] = useState<ExplorerFilter>(() => loadFilter())
  const deferredQuery = useDeferredValue(filter.query)
  const deferredFilter = useMemo(
    () => ({ ...filter, query: deferredQuery }),
    [filter.scope, filter.customExt, filter.hideHidden, filter.flat, deferredQuery],
  )

  useEffect(() => {
    homeDir().then(setHomePath)
  }, [])

  const filteredData = useMemo(
    () => filterExplorerTree(folderData, deferredFilter),
    [folderData, deferredFilter],
  )
  const queryActive = deferredQuery.trim() !== ''
  const renderFlatResults = queryActive || filter.flat

  const handleSelect = (item: IFile) => {
    if (item?.kind !== 'file') return
    bumpFrecency(item.path || '')
    addOpenedFile(item.id)
    setActiveId(item.id)
  }

  const handleClearRecent = () => {
    clearRecentWorkspaces()
  }

  const handleOpenHistoryListItemClick = useCallback(
    (item: ListDataItem) => {
      createNewWindow({ path: item.key as string })
      // openFolder(item.key as string)
    },
    [openFolder],
  )

  const handleContextMenu: MouseEventHandler = useCallback((e) => e.preventDefault(), [])

  const listData = useMemo(
    () =>
      recentWorkspaces.map((history: { path: string }) => ({
        key: history.path,
        title: getFolderName(history.path),
        tooltip: shortenPath(history.path, homePath),
        iconCls: 'ri-folder-5-line',
      })),
    [recentWorkspaces, homePath],
  )

  const containerCLs = classNames(props.className)

  return (
    <Container className={containerCLs} onContextMenu={handleContextMenu}>
      {folderData && folderData.length > 0 && (
        <FilterBar value={filter} onChange={setFilter} />
      )}
      <div className='h-full w-full overflow-hidden' ref={(ref) => setDndRootElement(ref)}>
        {filteredData && filteredData.length > 0 ? (
          renderFlatResults ? (
            <FlatResults
              files={filteredData}
              rootPath={folderData?.[0]?.path}
              query={deferredQuery}
              onOpen={handleSelect}
            />
          ) : (
            <FileTree
              data={filteredData}
              sourceData={folderData}
              activeId={activeId}
              onSelect={handleSelect}
              dndRootElement={dndRootElement as unknown as Node}
            />
          )
        ) : (
          <Empty />
        )}
      </div>
      <div className='explorer-bottom'>
        <span className='explorer-bottom__action cursor-pointer' onClick={openFolderDialog}>
          {t('file.openDir')}
        </span>
        <Popover
          classNames={{
            container: 'popover',
          }}
          placement='bottomRight'
          content={
            <>
              <List
                title={t('file.recentDir')}
                data={listData}
                onItemClick={handleOpenHistoryListItemClick}
              />
              <RecentListBottom onClick={handleClearRecent}>
                {t('file.clearRecent')}
              </RecentListBottom>
            </>
          }
        >
          {listData.length > 0 ? (
            <i className='ri-more-2-fill explorer-bottom__action__icon' />
          ) : null}
        </Popover>
      </div>
    </Container>
  )
}

interface ExplorerProps {
  className?: string
}

export default memo(Explorer)
