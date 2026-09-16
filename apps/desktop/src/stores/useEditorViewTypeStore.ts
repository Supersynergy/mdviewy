import bus from '@/helper/eventBus'
import useFileTypeConfigStore from '@/stores/useFileTypeConfigStore'
import { create } from 'zustand'
import type { EditorViewType } from 'rme'
import { immer } from 'zustand/middleware/immer'

const useEditorViewTypeStore = create(
  immer<EditorViewTypeStore>((set, get) => {
    return {
      editorViewTypeMap: new Map(),

      setEditorViewType: (id, viewType) =>
        set((state) => {
          state.editorViewTypeMap.set(id, viewType)
          return state
        }),

      getEditorViewType: (id) => {
        const state = get()
        const viewType = state.editorViewTypeMap.get(id)
        if (viewType) {
          return viewType
        }
        return 'preview' as EditorViewType
      },
    }
  }),
)

type EditorViewTypeStore = {
  editorViewTypeMap: Map<string, EditorViewType>
  setEditorViewType: (id: string, viewType: EditorViewType) => void
  getEditorViewType: (id: string) => EditorViewType
}

/**
 * Requests a view-mode change for a file. For markdown the mounted TextEditor
 * owns the transition (it saves first, then toggles); for types without a
 * wysiwyg mode (e.g. RTF preview ↔ source) no TextEditor may be mounted, so
 * the store is updated directly and Editor.tsx re-routes.
 */
export const requestEditorViewType = (id: string, target: string) => {
  const config = useFileTypeConfigStore.getState().getFileTypeConfigById(id)
  const modes = config?.supportedModes ?? []
  if (!modes.includes(target as EditorViewType)) return
  if (!modes.includes('wysiwyg' as EditorViewType)) {
    useEditorViewTypeStore.getState().setEditorViewType(id, target as EditorViewType)
  }
  bus.emit('editor_toggle_type', target)
}

export default useEditorViewTypeStore
