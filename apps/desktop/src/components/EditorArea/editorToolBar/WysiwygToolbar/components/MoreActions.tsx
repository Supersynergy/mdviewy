import useBookMarksStore from '@/extensions/bookmarks/useBookMarksStore'
import bus from '@/helper/eventBus'
import { getFileObject } from '@/helper/files'
import { useCommandStore, useEditorStore } from '@/stores'
import { useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { MfIconButton } from '../../../../ui-v2/Button'
import { showContextMenu } from '../../../../ui-v2/ContextMenu'

export const MoreActions = () => {
  const { activeId } = useEditorStore()
  const { execute } = useCommandStore()
  const { t } = useTranslation()
  const ref = useRef<any>(null)
  
  const curFile = activeId ? getFileObject(activeId) : undefined

  const handleMoreAction = useCallback(() => {
    const rect = ref.current?.getBoundingClientRect()
    if (rect === undefined) return
    const { findMark } = useBookMarksStore.getState()
    const curBookMark = findMark(curFile?.path || '')

    showContextMenu({
      x: rect.x,
      y: rect.y + rect.height,
      items: [
        {
          label: t('action.bookmark'),
          value: 'BookMark',
          checked: curBookMark !== undefined,
          handler: () => {
            if (curBookMark) {
              execute('edit_bookmark_dialog', curBookMark)
            } else {
              execute('open_bookmark_dialog', curFile)
            }
          },
        },
        {
          type: 'divider' as const,
        },
        {
          value: 'export_html',
          label: t('contextmenu.editor_tab.export_html'),
          handler: () => {
            bus.emit('editor_export_html')
          },
        },
        {
          value: 'export_image',
          label: t('contextmenu.editor_tab.export_image'),
          handler: () => {
            bus.emit('editor_export_image')
          },
        },
      ],
    })
  }, [curFile, execute, t])

  if (!curFile) return null

  return (
    <MfIconButton
      size='small'
      rounded='smooth'
      iconRef={ref}
      icon={'ri-more-fill'}
      onClick={handleMoreAction}
    />
  )
}
