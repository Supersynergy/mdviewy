import { logger } from '@/helper/logger'
import { addEmptyEditorTab } from '@/services/editor-file'
import { openRecentDocument } from '@/services/recent-documents'
import { currentWindow } from '@/services/windows'
import { useCommandStore, useEditorStore } from '@/stores'
import useAppSettingStore from '@/stores/useAppSettingStore'
import useOpenedCacheStore from '@/stores/useOpenedCacheStore'
import { requestEditorViewType } from '@/stores/useEditorViewTypeStore'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { openUrl } from '@tauri-apps/plugin-opener'
import { useEffect } from 'react'
import useOpen from './useOpen'

const REPOSITORY_URL = 'https://github.com/Supersynergy/mdviewy'
const ISSUES_URL = `${REPOSITORY_URL}/issues/new/choose`

const openPalette = (mode: 'all' | 'files' | 'content' | 'commands') => {
  window.dispatchEvent(new CustomEvent('mf:cmd_palette:open', { detail: mode }))
}

const ZOOM_STEP = 0.1
const ZOOM_MIN = 0.5
const ZOOM_MAX = 2

const applyZoom = (next: (current: number) => number) => {
  const { settingData, setSettingData } = useAppSettingStore.getState()
  const current = Number(settingData.webview_zoom ?? 1) || 1
  const value = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number(next(current).toFixed(2))))

  setSettingData({ webview_zoom: String(value) })
  void getCurrentWebview().setZoom(value)
}

const cycleTab = (offset: number) => {
  const { opened, activeId, setActiveId } = useEditorStore.getState()
  if (opened.length < 2) return

  const currentIndex = activeId ? opened.indexOf(activeId) : -1
  const nextIndex = (currentIndex + offset + opened.length) % opened.length
  setActiveId(opened[nextIndex])
}

/**
 * Backs the native menubar with real handlers.
 *
 * Menu items emit their id as a command; ids without a registered command are
 * dead entries in the menu. These are the app-level ones that no view owns.
 */
export const useNativeMenuCommands = () => {
  const { openFile } = useOpen()

  useEffect(() => {
    const { addCommand } = useCommandStore.getState()

    // EditorViewType values are plain strings ('sourceCode' | 'wysiwyg' |
    // 'preview'). Importing the enum from 'rme' here pulled the whole
    // remirror/prosemirror/mermaid graph into the entry chunk — the literals
    // keep the boot bundle small.
    const requestView = (target: string) => {
      const { activeId } = useEditorStore.getState()
      if (activeId) requestEditorViewType(activeId, target)
    }
    addCommand({ id: 'app_openFile', handler: () => void openFile() })
    addCommand({
      id: 'app_viewSourceCode',
      handler: () => requestView('sourceCode'),
    })
    addCommand({
      id: 'app_viewWysiwyg',
      handler: () => requestView('wysiwyg'),
    })
    addCommand({
      id: 'app_viewPreview',
      handler: () => requestView('preview'),
    })
    addCommand({ id: 'app_zoomIn', handler: () => applyZoom((zoom) => zoom + ZOOM_STEP) })
    addCommand({ id: 'app_zoomOut', handler: () => applyZoom((zoom) => zoom - ZOOM_STEP) })
    addCommand({ id: 'app_zoomReset', handler: () => applyZoom(() => 1) })
    addCommand({
      id: 'app_clearRecentDocuments',
      handler: () => {
        void useOpenedCacheStore
          .getState()
          .clearRecentDocuments()
          .then(() => invoke('refresh_native_menu'))
      },
    })

    addCommand({ id: 'app_newFile', handler: () => void addEmptyEditorTab() })
    addCommand({
      id: 'app_newWindow',
      handler: () => {
        invoke('create_new_window', { path: null }).catch((error) => {
          logger.error('Error creating new window:', error)
        })
      },
    })
    addCommand({ id: 'app_openCommandPalette', handler: () => openPalette('all') })
    addCommand({ id: 'app_goToFile', handler: () => openPalette('files') })
    addCommand({ id: 'app_openHeadingJumper', handler: () => openPalette('content') })
    addCommand({ id: 'app_openFileSearch', handler: () => openPalette('files') })
    addCommand({ id: 'app_findInFiles', handler: () => openPalette('content') })
    addCommand({ id: 'app_showRecent', handler: () => openPalette('files') })
    addCommand({ id: 'app_find', handler: () => useCommandStore.getState().execute('app_findReplaceEditor') })
    addCommand({ id: 'app_nextTab', handler: () => cycleTab(1) })
    addCommand({ id: 'app_prevTab', handler: () => cycleTab(-1) })
    addCommand({
      id: 'app_closeWindow',
      handler: () => {
        void getCurrentWindow().close()
      },
    })
    addCommand({ id: 'app_openGithub', handler: () => void openUrl(REPOSITORY_URL) })
    addCommand({ id: 'app_reportIssue', handler: () => void openUrl(ISSUES_URL) })
  }, [openFile])

  // `File ▸ Open Recent` lives in the native menubar, so its clicks arrive as
  // a window event rather than a command id.
  useEffect(() => {
    const unlisten = currentWindow.listen<string>('native:open_recent', ({ payload }) => {
      void openRecentDocument(payload)
    })

    return () => {
      unlisten.then((stop) => stop())
    }
  }, [])
}
