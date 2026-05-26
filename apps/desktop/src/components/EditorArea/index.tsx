import { EVENT } from '@/constants'
import bus from '@/helper/eventBus'
import { useCommandStore, useEditorStore } from '@/stores'
import useEditorViewTypeStore from '@/stores/useEditorViewTypeStore'
import useFileTypeConfigStore from '@/stores/useFileTypeConfigStore'
import { lazy, memo, Suspense, useEffect } from 'react'
import { EmptyState } from './EmptyState'

const EditorWorkspace = lazy(() => import('./EditorWorkspace'))

const SOURCECODE_VIEW_TYPE = 'sourceCode'
const WYSIWYG_VIEW_TYPE = 'wysiwyg'

function EditorWorkspaceFallback() {
  return <div className='w-full h-full' />
}

function EditorArea() {
  const { opened, activeId } = useEditorStore()
  const { addCommand } = useCommandStore()

  useEffect(() => {
    addCommand({
      id: EVENT.app_toggleEditorType,
      handler: () => {
        const { activeId } = useEditorStore.getState()
        if (!activeId) return

        const fileTypeConfig = useFileTypeConfigStore.getState().getFileTypeConfigById(activeId)
        if (!fileTypeConfig) return

        const supportsToggle =
          fileTypeConfig.supportedModes.includes(SOURCECODE_VIEW_TYPE as any) &&
          fileTypeConfig.supportedModes.includes(WYSIWYG_VIEW_TYPE as any)

        if (!supportsToggle) return

        const currentViewType = useEditorViewTypeStore.getState().getEditorViewType(activeId)
        const targetViewType =
          currentViewType === SOURCECODE_VIEW_TYPE ? WYSIWYG_VIEW_TYPE : SOURCECODE_VIEW_TYPE

        bus.emit('editor_toggle_type', targetViewType)
      },
    })
  }, [addCommand])

  if (opened.length === 0) {
    return <EmptyState />
  }

  return (
    <Suspense fallback={<EditorWorkspaceFallback />}>
      <EditorWorkspace opened={opened} activeId={activeId} />
    </Suspense>
  )
}

export default memo(EditorArea)
