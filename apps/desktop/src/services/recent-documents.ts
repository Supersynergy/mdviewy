import { getFileNameFromPath } from '@/helper/filesys'
import { logger } from '@/helper/logger'
import { getFileObject } from '@/helper/files'
import { useEditorStore } from '@/stores'
import { toast } from 'zens'

/**
 * Opens a document from the recent list. An already open tab is focused
 * instead of loaded a second time. Type routing (pdf/rtf/image/code) goes
 * through openPathInApp so recents work for every supported format.
 */
export const openRecentDocument = async (path: string) => {
  const { opened, setActiveId } = useEditorStore.getState()

  const openedId = opened.find((id) => getFileObject(id)?.path === path)
  if (openedId) {
    setActiveId(openedId)
    return
  }

  try {
    const { openPathInApp } = await import('@/services/openPaths')
    const ok = await openPathInApp(path)
    if (!ok) toast.error(`Cannot open ${getFileNameFromPath(path) || path}: unsupported file type`)
  } catch (error) {
    logger.error('Error opening recent document:', error)
    toast.error(`Could not open ${getFileNameFromPath(path) || path}`)
  }
}
