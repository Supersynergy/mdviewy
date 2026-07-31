import { invoke } from '@tauri-apps/api/core'
import { create } from 'zustand'

const useOpenedCacheStore = create<OpenedCacheStore>((set) => {
  return {
    recentWorkspaces: [],
    recentDocuments: [],
    setRecentWorkspaces: (recentWorkspaces: WorkspaceInfo[]) => {
      set((state) => {
        return {
          ...state,
          recentWorkspaces,
        }
      })
    },
    addRecentWorkspaces: async (workspace: WorkspaceInfo) => {
      const openedCache = await invoke<{ recent_workspaces: WorkspaceInfo[] }>(
        'add_recent_workspace',
        { workspace },
      )

      set((state) => {
        return {
          ...state,
          recentWorkspaces: openedCache.recent_workspaces,
        }
      })
    },
    setRecentDocuments: (recentDocuments: DocumentInfo[]) => {
      set((state) => {
        return {
          ...state,
          recentDocuments,
        }
      })
    },
    addRecentDocument: async (document: DocumentInfo) => {
      const openedCache = await invoke<{ recent_documents: DocumentInfo[] }>(
        'add_recent_document',
        { document },
      )

      set((state) => {
        return {
          ...state,
          recentDocuments: openedCache.recent_documents,
        }
      })

      // Keeps `File ▸ Open Recent` in the native menubar in sync.
      void invoke('refresh_native_menu').catch(() => undefined)
    },
    clearRecentDocuments: async () => {
      const openedCache = await invoke<{ recent_documents: DocumentInfo[] }>(
        'clear_recent_documents',
      )

      set((state) => {
        return {
          ...state,
          recentDocuments: openedCache.recent_documents,
        }
      })
    },
    clearRecentWorkspaces: async () => {
      const openedCache = await invoke<{ recent_workspaces: WorkspaceInfo[] }>(
        'clear_recent_workspaces',
      )

      set((state) => {
        return {
          ...state,
          recentWorkspaces: openedCache.recent_workspaces,
        }
      })
    }
  }
})

type OpenedCacheStore = {
  recentWorkspaces: WorkspaceInfo[]
  recentDocuments: DocumentInfo[]
  setRecentWorkspaces: (workspaces: WorkspaceInfo[]) => void
  addRecentWorkspaces: (workspace: WorkspaceInfo) => void
  clearRecentWorkspaces: () => void
  setRecentDocuments: (documents: DocumentInfo[]) => void
  addRecentDocument: (document: DocumentInfo) => Promise<void>
  clearRecentDocuments: () => Promise<void>
}

export default useOpenedCacheStore

export type WorkspaceInfo = {
  path: string
}

export type DocumentInfo = {
  path: string
  name: string
}
