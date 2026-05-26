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

export default useEditorViewTypeStore
