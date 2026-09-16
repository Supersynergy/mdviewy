import { EVENT } from '@/constants'
import { useCommandStore, useEditorStore } from '@/stores'
import useEditorViewTypeStore, { requestEditorViewType } from '@/stores/useEditorViewTypeStore'
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

        const modes = fileTypeConfig.supportedModes
        const currentViewType = useEditorViewTypeStore.getState().getEditorViewType(activeId)

        // Markdown: the classic sourceCode ↔ wysiwyg toggle. Other dual-mode
        // types (e.g. RTF = preview + sourceCode) toggle between their two
        // supported modes so Cmd+Shift+M still does something sensible.
        let targetViewType: string | undefined
        if (modes.includes(SOURCECODE_VIEW_TYPE as any) && modes.includes(WYSIWYG_VIEW_TYPE as any)) {
          targetViewType =
            currentViewType === SOURCECODE_VIEW_TYPE ? WYSIWYG_VIEW_TYPE : SOURCECODE_VIEW_TYPE
        } else if (modes.length === 2) {
          targetViewType = modes.find((m) => m !== currentViewType)
        }

        if (!targetViewType) return
        requestEditorViewType(activeId, targetViewType)
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
