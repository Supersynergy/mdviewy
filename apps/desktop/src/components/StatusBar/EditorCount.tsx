import Popover from '@/components/ui-v2/Popover'
import { useEditorStore } from '@/stores'
import useEditorCounterStore from '@/stores/useEditorCounterStore'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

const Container = styled.div`
  padding: 6px 10px;
  z-index: 2;
  font-size: 0.85rem;
  user-select: none;
  box-sizing: border-box;
  cursor: pointer;
  background-color: ${(props) => props.theme.statusBarBgColor};
  white-space: nowrap;
  overflow: hidden;
  max-width: 100%;
  border-radius: 6px;
  color: ${(props) => props.theme.labelFontColor};

  &:hover {
    background: ${(props) => props.theme.hoverColor};
    color: ${(props) => props.theme.primaryFontColor};
  }

  i {
    margin-right: 6px;
    font-size: 0.9rem;
  }
`

const PopoverContent = styled.div`
  min-width: 240px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 14px;
`

const PopoverTitle = styled.div`
  grid-column: 1 / -1;
  font-size: 0.75rem;
  color: #666;
  margin-bottom: 2px;
`

const Metric = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const MetricValue = styled.strong`
  font-size: 0.95rem;
`

const MetricLabel = styled.span`
  font-size: 0.72rem;
  color: #666;
`

export const EditorCount = () => {
  const { t } = useTranslation()
  const { editorCounterMap } = useEditorCounterStore()
  const { activeId } = useEditorStore()
  const [popoverVisible, setPopoverVisible] = useState(false)

  if (!activeId) {
    return null
  }

  const counter = editorCounterMap[activeId]

  if (!counter) {
    return null
  }

  const readTime = counter.readingTimeMinutes
  const completedTasks = `${counter.completedTaskCount}/${counter.taskCount}`
  const minLabel = readTime === 1 ? t('statusBar.min') : t('statusBar.mins')

  const popoverContent = (
    <PopoverContent>
      <PopoverTitle>{t('statusBar.documentInsights')}</PopoverTitle>
      <Metric>
        <MetricValue>{readTime} {minLabel}</MetricValue>
        <MetricLabel>{t('statusBar.readingTime')}</MetricLabel>
      </Metric>
      <Metric>
        <MetricValue>{counter.wordCount.toLocaleString()}</MetricValue>
        <MetricLabel>{t('statusBar.words')}</MetricLabel>
      </Metric>
      <Metric>
        <MetricValue>{counter.characterCount.toLocaleString()}</MetricValue>
        <MetricLabel>{t('statusBar.chars')}</MetricLabel>
      </Metric>
      <Metric>
        <MetricValue>{counter.headingCount}</MetricValue>
        <MetricLabel>{t('statusBar.headings')}</MetricLabel>
      </Metric>
      <Metric>
        <MetricValue>{completedTasks}</MetricValue>
        <MetricLabel>{t('statusBar.tasks')}</MetricLabel>
      </Metric>
      <Metric>
        <MetricValue>{counter.linkCount}</MetricValue>
        <MetricLabel>{t('statusBar.links')}</MetricLabel>
      </Metric>
      <Metric>
        <MetricValue>{counter.imageCount}</MetricValue>
        <MetricLabel>{t('statusBar.images')}</MetricLabel>
      </Metric>
      <Metric>
        <MetricValue>{counter.codeBlockCount}</MetricValue>
        <MetricLabel>{t('statusBar.codeBlocks')}</MetricLabel>
      </Metric>
      <Metric>
        <MetricValue>{counter.tableCount}</MetricValue>
        <MetricLabel>{t('statusBar.tables')}</MetricLabel>
      </Metric>
      <Metric>
        <MetricValue>{counter.frontmatter ? t('common.yes') : t('common.no')}</MetricValue>
        <MetricLabel>{t('statusBar.frontmatter')}</MetricLabel>
      </Metric>
    </PopoverContent>
  )

  return (
    <Popover
      content={popoverContent}
      trigger='click'
      open={popoverVisible}
      onOpenChange={setPopoverVisible}
      placement='topRight'
    >
      <Container>
        <i className='ri-timer-flash-line' />
        <span>{readTime} {minLabel} · {counter.wordCount.toLocaleString()} {t('statusBar.words')}</span>
      </Container>
    </Popover>
  )
}
