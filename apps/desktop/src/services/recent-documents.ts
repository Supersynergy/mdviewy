import { getFileNameFromPath } from '@/helper/filesys'
import { logger } from '@/helper/logger'
import { addExistingMarkdownFileEdit } from '@/services/editor-file'
import { getFileContent } from '@/services/file-info'
import { useEditorStore } from '@/stores'
import { getFileObject } from '@/helper/files'
import { toast } from 'zens'

/**
 * Opens a document from the recent list. An already open tab is focused
 * instead of loaded a second time.
 */
export const openRecentDocument = async (path: string) => {
  const { opened, setActiveId } = useEditorStore.getState()

  const openedId = opened.find((id) => getFileObject(id)?.path === path)
  if (openedId) {
    setActiveId(openedId)
    return
  }

  try {
    const content = await getFileContent({ filePath: path })
    if (content === null) {
      toast.error(`Could not open ${getFileNameFromPath(path) || path}`)
      return
    }

    await addExistingMarkdownFileEdit({
      fileName: getFileNameFromPath(path) || path,
      content,
      path,
    })
  } catch (error) {
    logger.error('Error opening recent document:', error)
    toast.error(`Could not open ${getFileNameFromPath(path) || path}`)
  }
}
