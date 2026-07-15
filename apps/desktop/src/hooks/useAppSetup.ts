import useAiChatStore from '@/extensions/ai/useAiChatStore'
import bus from '@/helper/eventBus'
import { loadLocalThemeCss } from '@/helper/extensions'
import { getFileObject, getFileObjectByPath, getSaveOpenedEditorEntries } from '@/helper/files'
import { getFileNameFromPath, readDirectory } from '@/helper/filesys'
import { logger } from '@/helper/logger'
import { parseOpenedEvent, parseOpenedPaths } from '@/helper/openedPaths'
import { requestDocumentFocus } from '@/helper/documentFocus'
import { i18nInit } from '@/i18n'
import { appSettingStoreSetup } from '@/services/app-setting'
import { checkUnsavedFiles } from '@/services/checkUnsavedFiles'
import { addExistingMarkdownFileEdit } from '@/services/editor-file'
import { getFileContent } from '@/services/file-info'
import { createNewWindow, currentWindow } from '@/services/windows'
import { useCommandStore, useEditorStore } from '@/stores'
import useAppSettingStore from '@/stores/useAppSettingStore'
import type { WorkspaceInfo } from '@/stores/useOpenedCacheStore'
import useOpenedCacheStore from '@/stores/useOpenedCacheStore'
import { useSuspenseQuery } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import { LazyStore } from '@tauri-apps/plugin-store'
import { useCallback, useEffect } from 'react'
import { toast } from 'zens'
import { useGlobalKeyboard, useGlobalOSInfo } from '.'
import __MDVIEWY__ from '../context'
import { isArray } from '../helper'
import useExtensionsManagerStore from '../stores/useExtensionsManagerStore'
import useThemeStore, { isBuiltInTheme } from '../stores/useThemeStore'
import useWorkspaceWatcher from './useWorkspaceWatcher'

declare global {
  interface Window {
    __mdviewyOpenPaths?: (paths: string[]) => void
  }
}

interface LocalTheme {
  id: string
  name: string
  path: string
  css_content: string
}

const onceAsync = <T,>(fn: () => Promise<T>) => {
  let promise: Promise<T> | undefined

  return () => {
    promise ??= fn()
    return promise
  }
}

async function appThemeExtensionsSetup(curTheme: string) {
  if (isBuiltInTheme(curTheme)) {
    useThemeStore.getState().setCurThemeByName(curTheme)
  }

  const localThemes = await invoke<LocalTheme[]>('load_local_themes')
  if (localThemes.length > 0) {
    const cssContents = localThemes.map((t) => t.css_content)
    loadLocalThemeCss(cssContents)
  }

  invoke<Record<string, any>>('load_themes').then((res) => {
    if (isArray(res)) {
      try {
        res.map((extension) => {
          useExtensionsManagerStore.getState().loadExtension(extension)
        })
      } catch (error) {
        toast.error(`Failed to load extensions: ${error}`)
      } finally {
        useThemeStore.getState().setCurThemeByName(curTheme)
      }
    } else {
      useThemeStore.getState().setCurThemeByName(curTheme)
    }
  })
}

async function handleOpenedPaths(openedPaths: string[]) {
  const { setFolderData, addOpenedFile, setActiveId } = useEditorStore.getState()

  logger.debug('handleOpenedPaths', openedPaths)

  const handleOpenedPath = async (openedPath: string) => {
    const isDir = await invoke<boolean>('is_dir', { path: openedPath })

    if (isDir) {
      const rootPath = useEditorStore.getState().getRootPath()
      if (openedPath === rootPath) {
        return
      }
      if (rootPath || openedPaths.length > 1) {
        await createNewWindow({ path: openedPath })
      } else {
        await readDirectory(openedPath).then((res) => {
          setFolderData(res)
        })
      }
      return false
    } else {
      const existingFile = getFileObjectByPath(openedPath)
      if (existingFile) {
        setActiveId(existingFile.id)
        addOpenedFile(existingFile.id)
      } else {
        const fileContent = await getFileContent({ filePath: openedPath })
        if (fileContent === null) return
        const fileName = getFileNameFromPath(openedPath) || 'new-file.md'
        await addExistingMarkdownFileEdit({
          fileName,
          content: fileContent,
          path: openedPath,
        })
      }
      return true
    }
  }

  if (openedPaths.length === 1) {
    const openedFile = await handleOpenedPath(openedPaths[0])
    if (openedFile) requestDocumentFocus()
  } else {
    await Promise.all(openedPaths.map(handleOpenedPath))
  }
}

let openedPathIngress = Promise.resolve(false)

function consumeOpenedPathIngress(eventPaths: string[] = []) {
  const task = openedPathIngress.then(async () => {
    const injectedPaths = parseOpenedPaths(window.openedUrls)
    window.openedUrls = null
    const queuedPaths = await invoke<string[]>('take_opened_paths').catch(() => [])
    const openedPaths = Array.from(new Set([...eventPaths, ...injectedPaths, ...queuedPaths]))
    if (openedPaths.length === 0) return false

    await handleOpenedPaths(openedPaths)
    return true
  })

  openedPathIngress = task.catch((error) => {
    logger.error('Failed to consume opened paths', error)
    return false
  })
  return task
}

// Rust calls this fixed, tiny bridge for warm Finder opens. Tauri events and
// the Rust queue remain fallbacks, but the primary path no longer depends on a
// focus/listener race inside React's effect lifecycle.
window.__mdviewyOpenPaths = (paths) => {
  void consumeOpenedPathIngress(parseOpenedPaths(paths)).then((consumed) => {
    if (consumed) currentWindow.setFocus()
  })
}

async function appWorkspaceSetup() {
  const { setRecentWorkspaces } = useOpenedCacheStore.getState()
  const { setFolderData, addOpenedFile, setActiveId } = useEditorStore.getState()
  logger.debug('=== appWorkspaceSetup: Checking window.openedUrls ===')
  logger.debug('window.openedUrls', window.openedUrls)

  try {
    const cacheStore = await new LazyStore('.mdviewy_workspaces.dat')

    const getOpenedCacheRes = await invoke<{ recent_workspaces: WorkspaceInfo[] }>(
      'get_opened_cache',
    )
    const recentWorkspaces = getOpenedCacheRes.recent_workspaces
    setRecentWorkspaces(recentWorkspaces)

    if (await consumeOpenedPathIngress()) return

    if (recentWorkspaces.length > 0) {
      const targetWorkspacePath = recentWorkspaces[0].path
      const cacheStoreInitPromises = Promise.all([
        cacheStore.get<{
          openedFilePaths: string[]
          activeFilePath: string
        }>(targetWorkspacePath),
      ])
      const cacheStoreInitPromisesRes = await cacheStoreInitPromises
      await readDirectory(targetWorkspacePath).then((res) => {
        setFolderData(res)
        const { openedFilePaths, activeFilePath } = cacheStoreInitPromisesRes[0] || {}

        if (activeFilePath) {
          const activeFile = getFileObjectByPath(activeFilePath)
          if (activeFile) {
            setActiveId(activeFile.id)
            addOpenedFile(activeFile.id)
          }
        }

        if (openedFilePaths) {
          openedFilePaths.forEach((path) => {
            const cur = getFileObjectByPath(path)
            if (cur) {
              addOpenedFile(cur.id)
            }
          })
        }

        useEditorStore.subscribe((state) => {
          const rootPath = state.getRootPath()
          if (rootPath) {
            const openedFiles = state.opened.map((fileId) => {
              const file = getFileObject(fileId)
              return file.path
            })

            cacheStore.set(rootPath, {
              openedFilePaths: openedFiles,
              activeFilePath: state.activeId ? getFileObject(state.activeId)?.path : '',
            })
            cacheStore.save()
          }
        })
      })
    }
  } catch (error) {
    logger.error('Failed to load workspace', error)
  }
}

const listener = (event: MessageEvent) => {
  if (event.origin !== window.location.origin) {
    return
  }

  const { key, payload } = event.data

  switch (key) {
    case 'registerTheme':
      __MDVIEWY__.theme.registerTheme(payload)
      break
  }
}

const useMainStoreSetup = () => {
  useAppSettingStore()
  useAiChatStore()
}

const appSetup = onceAsync(async function () {
  // CRITICAL PATH — minimum work to render the shell correctly.
  // Goal: first paint in <1s. Everything else is deferred to idle time.
  useMainStoreSetup()

  const settingData = await appSettingStoreSetup()

  window.removeEventListener('message', listener)
  window.addEventListener('message', listener)

  // i18n and theme are required before first paint (visible flash otherwise).
  i18nInit({ lng: settingData.language })
  appThemeExtensionsSetup(settingData.theme)

  // Initialize zoom level — required before paint.
  if (settingData.webview_zoom) {
    const webview = getCurrentWebview()
    webview.setZoom(Number(settingData.webview_zoom))
  }

  // DEFERRED — run after the shell has painted. Schedule via requestIdleCallback
  // (fallback setTimeout) so the viewer is interactive instantly.
  const schedule = (cb: () => void) => {
    const ric = (window as any).requestIdleCallback as undefined | ((c: () => void, opts?: any) => number)
    if (ric) ric(cb, { timeout: 500 })
    else setTimeout(cb, 0)
  }

  schedule(() => {
    appWorkspaceSetup().catch((e) => logger.error('appWorkspaceSetup deferred failed', e))
  })

  // Pre-warm the WYSIWYG editor delegate during idle time. First md-file-open
  // currently pays the full remirror manager init cost on the critical path;
  // warming it here moves that cost to background time so the first real open
  // is near-instant.
  schedule(async () => {
    try {
      const [editor, opts] = await Promise.all([
        import('@/components/EditorArea/createMdviewyWysiwygDelegate'),
        import('@/components/EditorArea/createWysiwygDelegateOptions'),
      ])
      // Create + discard. Internal caches (schemas, plugins, parsers) stay
      // warm in remirror's module-level singletons.
      editor.createMdviewyWysiwygDelegate(opts.createWysiwygDelegateOptions())
    } catch (e) {
      logger.debug('editor pre-warm failed (non-fatal)', e)
    }
  })

  return settingData
})

const useFontfamilySetup = () => {
  const { osType } = useGlobalOSInfo()

  if (osType === 'macos') {
    document.body.style.fontFamily = 'SF Pro,-apple-system,BlinkMacSystemFont,sans-serif'
  } else if (osType === 'windows') {
    document.body.style.fontFamily = 'Segoe UI, Roboto, Helvetica, Arial, sans-serif'
  } else if (osType === 'linux') {
    document.body.style.fontFamily = 'Ubuntu, Roboto, Helvetica, Arial, sans-serif'
  }
}

const useAppSetup = () => {
  const eventInit = useCallback(() => {
    const closeRequest = currentWindow.listen('tauri://close-requested', async () => {
      const handleCloseWindow = async () => {
        closeRequest.then((fn) => fn())
        currentWindow.destroy()
      }

      const openedIds = useEditorStore.getState().opened
      if (
        checkUnsavedFiles({
          fileIds: openedIds,
          onSaveAndClose: async (hasUnsavedFileIds) => {
            const saves = hasUnsavedFileIds.map((otherId) => getSaveOpenedEditorEntries(otherId))
            await Promise.all(saves.map((saveHandler) => saveHandler?.()))
            handleCloseWindow()
          },
          onUnsavedAndClose: () => {
            handleCloseWindow()
          },
        }) > 0
      ) {
        return false
      } else {
        handleCloseWindow()

        return true
      }
    })

    const settingDataUpdate = currentWindow.listen('app_conf_change', async () => {
      appSettingStoreSetup()
    })

    const unListenMenu = currentWindow.listen<string>('native:menu', ({ payload }) => {
      bus.emit(payload)
      useCommandStore.getState().execute(payload)
    })

    const consumeAndFocus = async (event?: unknown) => {
      // Warm macOS opens already contain the authoritative path list. Consume
      // that payload directly instead of relying only on a shared one-shot
      // queue that a concurrent focus event may drain first.
      if (await consumeOpenedPathIngress(parseOpenedEvent(event))) currentWindow.setFocus()
    }
    const unListenOpenedUrls = currentWindow.listen('opened-urls', consumeAndFocus)
    const unListenWindowFocus = currentWindow.listen('tauri://focus', consumeAndFocus)
    window.addEventListener('mdviewy-opened-urls', consumeAndFocus)
    window.addEventListener('focus', consumeAndFocus)

    return () => {
      unListenMenu.then((fn) => fn())
      closeRequest.then((fn) => fn())
      unListenOpenedUrls.then((fn) => fn())
      unListenWindowFocus.then((fn) => fn())
      window.removeEventListener('mdviewy-opened-urls', consumeAndFocus)
      window.removeEventListener('focus', consumeAndFocus)
      settingDataUpdate.then((fn) => fn())
    }
  }, [])

  // native event listener
  useEffect(() => {
    const unlisten = eventInit()

    return () => {
      unlisten()
    }
  }, [eventInit])

  useSuspenseQuery({
    queryKey: ['appSetup'],
    queryFn: appSetup,
  })

  useGlobalOSInfo()
  useGlobalKeyboard()
  useWorkspaceWatcher()
  useFontfamilySetup()
}

export default useAppSetup
