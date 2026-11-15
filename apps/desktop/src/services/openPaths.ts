import { getFileObjectByPath, getSaveOpenedEditorEntries } from '@/helper/files'
import { expandUserPath } from '@/helper/pathCandidates'
import { getFileTypeConfig, isTextfileType } from '@/helper/fileTypeHandler'
import { getFileNameFromPath, readDirectory } from '@/helper/filesys'
import { logger } from '@/helper/logger'
import { requestDocumentFocus } from '@/helper/documentFocus'
import { addExistingMarkdownFileEdit } from '@/services/editor-file'
import { checkUnsavedFiles } from '@/services/checkUnsavedFiles'
import { getFileContent } from '@/services/file-info'
import useEditorStore from '@/stores/useEditorStore'
import { invoke } from '@tauri-apps/api/core'
import type { EditorViewType } from 'rme'
import { toast } from 'zens'

export async function handleOpenedPaths(openedPaths: string[]) {
  const { setFolderData, addOpenedFile, setActiveId } = useEditorStore.getState()

  logger.debug('handleOpenedPaths', openedPaths)

  const handleOpenedPath = async (rawPath: string): Promise<boolean> => {
    try {
      const openedPath = await expandUserPath(rawPath)
      const isDir = await invoke<boolean>('is_dir', { path: openedPath })

      if (isDir) {
        const rootPath = useEditorStore.getState().getRootPath()
        if (openedPath === rootPath) {
          return false
        }
        if (rootPath || openedPaths.length > 1) {
          // Lazy: services/windows evaluates getCurrentWindow() at import time,
          // which only works inside the real Tauri webview.
          const { createNewWindow } = await import('@/services/windows')
          await createNewWindow({ path: openedPath })
        } else {
          const proceed = async () => {
            try {
              const res = await readDirectory(openedPath)
              setFolderData(res)
            } catch (error) {
              toast.error(
                `Cannot open folder ${openedPath}: ${error instanceof Error ? error.message : error}`,
              )
              return false
            }
            return true
          }
          // Same unsaved-edits guard as window close: a workspace switch
          // drops every open tab.
          if (
            checkUnsavedFiles({
              fileIds: useEditorStore.getState().opened,
              onSaveAndClose: async (ids) => {
                for (const id of ids) await getSaveOpenedEditorEntries(id)?.()
                void proceed()
              },
              onUnsavedAndClose: () => void proceed(),
            }) > 0
          ) {
            return false
          }
          await proceed()
        }
        return false
      }
      const existingFile = getFileObjectByPath(openedPath)
      if (existingFile) {
        setActiveId(existingFile.id)
        addOpenedFile(existingFile.id)
      } else {
        const fileName = getFileNameFromPath(openedPath) || 'new-file.md'
        const config = getFileTypeConfig({ name: fileName, path: openedPath, kind: 'file', id: '' })
        if (config.type === 'unsupported') {
          toast.error(`Cannot open ${fileName}: unsupported file type`)
          return false
        }
        // Binary previews (pdf/image) load bytes in the preview; only text
        // types need content here. A failed read must surface — agent-driven
        // opens have no human watching for a silent no-op.
        if (isTextfileType(config) || config.supportedModes.includes('sourceCode' as EditorViewType)) {
          const fileContent = await getFileContent({ filePath: openedPath })
          if (fileContent === null) {
            toast.error(`Cannot open ${fileName}: not found or not readable as text`)
            return false
          }
          await addExistingMarkdownFileEdit({ fileName, content: fileContent, path: openedPath })
        } else {
          await addExistingMarkdownFileEdit({ fileName, content: '', path: openedPath })
        }
      }
      return true
    } catch (error) {
      // One bad path in a batch must not kill focus/feedback for the rest.
      toast.error(
        `Cannot open ${rawPath}: ${error instanceof Error ? error.message : String(error)}`,
      )
      return false
    }
  }

  if (openedPaths.length === 1) {
    const openedFile = await handleOpenedPath(openedPaths[0])
    if (openedFile) requestDocumentFocus()
  } else {
    await Promise.all(openedPaths.map(handleOpenedPath))
    // Deterministic activation: argv order, not IPC latency, picks the tab.
    const lastRaw = openedPaths[openedPaths.length - 1]
    const last = getFileObjectByPath(await expandUserPath(lastRaw))
    if (last) setActiveId(last.id)
  }
}

/**
 * Opens a local path inside the app — activates an existing tab or creates a
 * file object with the right type routing. Returns false for types the app
 * cannot display so callers can fall back to the system handler.
 */
export const openPathInApp = async (path: string): Promise<boolean> => {
  const resolved = await expandUserPath(path)
  const config = getFileTypeConfig({
    name: getFileNameFromPath(resolved) || '',
    path: resolved,
    kind: 'file',
    id: '',
  })
  if (config.type === 'unsupported') return false
  await handleOpenedPaths([resolved])
  return true
}
