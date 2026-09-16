import { readDirectory } from '@/helper/filesys'
import { getFileTypeConfig, isTextfileType, OPEN_DIALOG_EXTENSIONS } from '@/helper/fileTypeHandler'
import { logger } from '@/helper/logger'
import { addExistingMarkdownFileEdit } from '@/services/editor-file'
import { getFileContent } from '@/services/file-info'
import { currentWindow } from '@/services/windows'
import { useEditorStore } from '@/stores'
import useOpenedCacheStore from '@/stores/useOpenedCacheStore'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { useCallback } from 'react'
import { toast } from 'zens'

const useOpen = () => {
  const { addRecentWorkspaces } = useOpenedCacheStore()

  /**
   * Opens a workspace in the current window. Picking a folder is a frequent
   * action, so it no longer asks current-window-or-new-window first; a folder
   * that is already open in another window focuses that window instead.
   * Use `openFolderInNewWindow` for the explicit new-window case.
   */
  const openFolder = useCallback(
    async (dir: string) => {
      try {
        const existingWindowLabel = (await invoke('check_window_by_path', {
          path: dir,
        })) as string | null

        if (existingWindowLabel) {
          if (currentWindow.label === existingWindowLabel) {
            return
          }

          await invoke('focus_window_by_label', {
            windowLabel: existingWindowLabel,
          })
          addRecentWorkspaces({ path: dir })

          logger.info('Focused existing window for path:', existingWindowLabel)
          return
        }

        const res = await readDirectory(dir)
        addRecentWorkspaces({ path: dir })
        useEditorStore.getState().setFolderData(res)

        logger.info('Opening folder in current window:', dir)
      } catch (error) {
        logger.error('Error opening folder in current window:', error)
        toast.error(`Could not open folder: ${String(error)}`)
      }
    },
    [addRecentWorkspaces],
  )

  const openFolderInNewWindow = useCallback(
    async (dir: string) => {
      try {
        await invoke('create_new_window', { path: dir })
        addRecentWorkspaces({ path: dir })
      } catch (error) {
        logger.error('Error creating new window:', error)
        toast.error(`Could not open folder: ${String(error)}`)
      }
    },
    [addRecentWorkspaces],
  )

  const openFolderDialog = useCallback(async () => {
    const dir = await open({ directory: true, recursive: true })

    if (typeof dir !== 'string') return
    openFolder(dir)
  }, [openFolder])

  const openFile = useCallback(async () => {
    const file = await open({
      multiple: false,
      filters: [
        { name: 'Supported', extensions: OPEN_DIALOG_EXTENSIONS },
        { name: 'All Files', extensions: ['*'] },
      ],
    })

    if (typeof file !== 'string') return

    const fileName = file.split('/').pop() || 'new-file.md'
    const config = getFileTypeConfig({ name: fileName, path: file } as any)

    // Binary preview types (pdf, image) have no text content to load — the
    // preview reads bytes itself. Text/RTF/code files need the content up
    // front so a read failure surfaces instead of opening an empty tab.
    if (isTextfileType(config) || config.supportedModes.includes('sourceCode' as any)) {
      const fileContent = await getFileContent({ filePath: file })
      if (fileContent === null) {
        toast.error(`Could not open ${fileName} — file is missing or not readable as text`)
        return
      }
      await addExistingMarkdownFileEdit({ fileName, content: fileContent, path: file })
    } else {
      await addExistingMarkdownFileEdit({ fileName, content: '', path: file })
    }
  }, [addRecentWorkspaces])

  return {
    openFolderDialog,
    openFolder,
    openFolderInNewWindow,
    openFile,
  }
}

export default useOpen
