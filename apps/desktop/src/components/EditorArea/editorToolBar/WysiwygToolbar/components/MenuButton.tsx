import { MfIconLabelButton } from '@/components/ui-v2/Button/icon-label-button'
import EVENT from '@/constants/event'
import useBookMarksStore from '@/extensions/bookmarks/useBookMarksStore'
import bus from '@/helper/eventBus'
import { getFileObject } from '@/helper/files'
import { shortcutFor } from '@/helper/keybindingLabel'
import { debounce } from '@/helper/timing'
import useGlobalKeyboard from '@/hooks/useKeyboard'
import { currentWindow } from '@/services/windows'
import { useCommandStore, useEditorStateStore, useEditorStore } from '@/stores'
import useLayoutStore from '@/stores/useLayoutStore'
import useOpenedCacheStore from '@/stores/useOpenedCacheStore'
import { openRecentDocument } from '@/services/recent-documents'
import useEditorViewTypeStore from '@/stores/useEditorViewTypeStore'
import useFileTypeConfigStore from '@/stores/useFileTypeConfigStore'
import NiceModal from '@ebay/nice-modal-react'
import { invoke } from '@tauri-apps/api/core'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EditorViewType } from 'rme'
import { Space, toast } from 'zens'
import { MODAL_INFO_ID } from '../../../../Modal'
import { toggleContextMenu } from '../../../../ui-v2/ContextMenu'

type FileNormalInfo = {
  size: string
  last_modified: string
}

const EMPTY_FILE_NORMAL_INFO: FileNormalInfo = {
  size: '',
  last_modified: '',
}

export const MenuButton = memo(() => {
  const { activeId } = useEditorStore()
  const { execute } = useCommandStore()
  const { editorViewTypeMap } = useEditorViewTypeStore()
  const { keyboardInfos } = useGlobalKeyboard()
  const { leftBar, rightBar } = useLayoutStore()
  const { recentDocuments } = useOpenedCacheStore()
  const { t } = useTranslation()
  const ref = useRef<any>(null)

  const [fileNormalInfo, setFileNormalInfo] = useState<FileNormalInfo>(EMPTY_FILE_NORMAL_INFO)

  const curFile = activeId ? getFileObject(activeId) : undefined
  const editorViewType = editorViewTypeMap.get(curFile?.id || '') || 'wysiwyg'

  const { idStateMap } = useEditorStateStore()
  const editorState = activeId ? idStateMap.get(activeId) : undefined

  const getFileNormalInfo = useCallback(
    debounce(async () => {
      if (!curFile?.path) {
        setFileNormalInfo(EMPTY_FILE_NORMAL_INFO)
        return
      }

      try {
        const res = await invoke<FileNormalInfo>('get_file_normal_info', {
          path: curFile.path,
        })

        setFileNormalInfo(res)
      } catch (error: unknown) {
        toast.error((error as Error).message)
      }
    }, 500),
    [curFile],
  )

  useEffect(() => {
    getFileNormalInfo()
  }, [editorState?.hasUnsavedChanges, getFileNormalInfo])

  useEffect(() => {
    const unsubscribe = currentWindow.listen<{
      paths: string[]
    }>('file_watcher_event', async (res) => {
      if (!curFile?.path) {
        return
      }
      if (Array.isArray(res.payload?.paths) && res.payload.paths.includes(curFile.path)) {
        getFileNormalInfo()
      }
    })

    return () => {
      unsubscribe.then((f) => f())
    }
  }, [curFile, getFileNormalInfo])

  const handleMenuClick = useCallback(() => {
    const rect = ref.current?.getBoundingClientRect()
    if (rect === undefined) return

    const { getFileTypeConfigById } = useFileTypeConfigStore.getState()
    const curFileTypeConfig = getFileTypeConfigById(curFile?.id || '')
    const { findMark } = useBookMarksStore.getState()
    const curBookMark = findMark(curFile?.path || '')

    toggleContextMenu({
      x: rect.x,
      y: rect.y + rect.height,
      items: [
        {
          label: t('view.label'),
          value: 'view_switcher',
          children: [
            {
              label: t('view.source_code'),
              value: EditorViewType.SOURCECODE,
              checked: editorViewType === EditorViewType.SOURCECODE,
              handler: () => bus.emit('editor_toggle_type', EditorViewType.SOURCECODE),
            },
            {
              label: t('view.wysiwyg'),
              value: EditorViewType.WYSIWYG,
              checked: editorViewType === EditorViewType.WYSIWYG,
              handler: () => bus.emit('editor_toggle_type', EditorViewType.WYSIWYG),
            },
            {
              label: t('view.preview'),
              value: EditorViewType.PREVIEW,
              checked: editorViewType === EditorViewType.PREVIEW,
              handler: () => bus.emit('editor_toggle_type', EditorViewType.PREVIEW),
            },
          ].filter((item) => {
            return curFileTypeConfig ? curFileTypeConfig?.supportedModes?.includes(item.value) : false
          }),
        },
        {
          type: 'divider' as const,
        },
        {
          label: t('menu.find_replace'),
          value: 'find_replace',
          shortcut: shortcutFor(keyboardInfos, 'app_findReplaceEditor'),
          handler: () => execute('app_findReplaceEditor'),
        },
        {
          label: t('menu.command_palette'),
          value: 'command_palette',
          shortcut: 'Cmd+K',
          handler: () =>
            window.dispatchEvent(new CustomEvent('mf:cmd_palette:open', { detail: 'all' })),
        },
        {
          type: 'divider' as const,
        },
        {
          label: t('menu.left_sidebar'),
          value: 'toggle_left_sidebar',
          checked: leftBar.visible,
          shortcut: shortcutFor(keyboardInfos, 'app_toggleLeftsidebarVisible'),
          handler: () => execute('app_toggleLeftsidebarVisible'),
        },
        {
          label: t('menu.right_sidebar'),
          value: 'toggle_right_sidebar',
          checked: rightBar.visible,
          shortcut: shortcutFor(keyboardInfos, 'app_toggleRightsidebarVisible'),
          handler: () => execute('app_toggleRightsidebarVisible'),
        },
        {
          label: t('menu.reset_layout'),
          value: 'reset_layout',
          handler: () => execute('app_reset_layout'),
        },
        {
          type: 'divider' as const,
        },
        {
          label: t('menu.save_now'),
          value: 'save_now',
          shortcut: shortcutFor(keyboardInfos, EVENT.app_save),
          handler: () => execute(EVENT.app_save),
        },
        {
          label: t('file.info'),
          value: 'file_info',
          handler: () => {
            NiceModal.show(MODAL_INFO_ID, {
              title: t('file.info'),
              width: '600px',
              content: (
                <Space direction='vertical'>
                  <span>
                    {t('file.lastModified')}: {fileNormalInfo.last_modified}
                  </span>
                  <span>
                    {t('file.size')}: {fileNormalInfo.size}
                  </span>
                  <span>
                    {t('file.path')}: {curFile?.path}
                  </span>
                </Space>
              ),
            })
          },
        },
        {
          type: 'divider' as const,
        },
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
          label: t('menu.recent_documents'),
          value: 'recent_documents',
          children:
            recentDocuments.length > 0
              ? recentDocuments.slice(0, 20).map((document) => ({
                  label: document.name,
                  value: `recent_document:${document.path}`,
                  handler: () => {
                    void openRecentDocument(document.path)
                  },
                }))
              : [
                  {
                    label: t('menu.no_recent_documents'),
                    value: 'recent_documents_empty',
                  },
                ],
        },
        {
          label: t('file.openDir'),
          value: 'open_folder',
          shortcut: shortcutFor(keyboardInfos, EVENT.app_openFolder),
          handler: () => execute(EVENT.app_openFolder),
        },
        {
          label: t('menu.settings'),
          value: 'open_settings',
          shortcut: shortcutFor(keyboardInfos, EVENT.app_openSetting),
          handler: () => execute(EVENT.app_openSetting),
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
        {
          value: 'print_pdf',
          label: t('contextmenu.editor_tab.print_pdf'),
          handler: () => {
            bus.emit('editor_print_pdf')
          },
        },
      ],
    })
  }, [
    curFile,
    editorViewType,
    t,
    execute,
    fileNormalInfo,
    keyboardInfos,
    leftBar.visible,
    rightBar.visible,
    recentDocuments,
  ])

  if (!curFile) return null

  return (
    <MfIconLabelButton
      iconRef={ref}
      icon={'ri-menu-line'}
      onClick={handleMenuClick}
      tooltipProps={{ title: t('action.more') }}
      label={t('common.menu')}
    />
  )
})
