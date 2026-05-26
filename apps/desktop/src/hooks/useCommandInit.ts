import { EVENT } from '@/constants'
import { useCommandStore, useEditorStore } from '@/stores'
import { hide } from '@tauri-apps/api/app'
import { useEffect } from 'react'
import useOpen from './useOpen'

export const useCommandInit = () => {
  const { openFolderDialog } = useOpen()

  useEffect(() => {
    useCommandStore.getState().addCommand({ id: EVENT.app_openFolder, handler: openFolderDialog })
  }, [openFolderDialog])

  useEffect(() => {
    useCommandStore.getState().addCommand({ id: EVENT.app_hide, handler: hide })
  }, [])

  useEffect(() => {
    const add = useCommandStore.getState().addCommand
    add({
      id: 'app_openCommandPalette',
      handler: () =>
        window.dispatchEvent(new CustomEvent('mf:cmd_palette:open', { detail: 'all' })),
    })
    add({
      id: 'app_openHeadingJumper',
      handler: () =>
        window.dispatchEvent(new CustomEvent('mf:cmd_palette:open', { detail: 'all' })),
    })
    add({
      id: 'app_find',
      handler: () => {
        const input = document.querySelector(
          'input[placeholder^="Quick find"], input[placeholder^="Type"]',
        ) as HTMLInputElement | null
        input?.focus()
        input?.select()
      },
    })
    add({
      id: 'app_findInFiles',
      handler: () =>
        window.dispatchEvent(new CustomEvent('mf:cmd_palette:open', { detail: 'content' })),
    })
    add({
      id: 'app_showRecent',
      handler: () =>
        window.dispatchEvent(new CustomEvent('mf:cmd_palette:open', { detail: 'files' })),
    })
    add({
      id: 'app_nextTab',
      handler: () => {
        const s = useEditorStore.getState()
        const opened = s.opened
        if (!opened.length) return
        const idx = opened.indexOf(s.activeId || '')
        const next = opened[(idx + 1) % opened.length]
        if (next) s.setActiveId(next)
      },
    })
    add({
      id: 'app_prevTab',
      handler: () => {
        const s = useEditorStore.getState()
        const opened = s.opened
        if (!opened.length) return
        const idx = opened.indexOf(s.activeId || '')
        const next = opened[(idx - 1 + opened.length) % opened.length]
        if (next) s.setActiveId(next)
      },
    })
    add({
      id: 'app_openGithub',
      handler: () => window.open('https://github.com/Supersynergy/mdviewy', '_blank'),
    })
    add({
      id: 'app_reportIssue',
      handler: () => window.open('https://github.com/Supersynergy/mdviewy/issues/new', '_blank'),
    })
  }, [])
}
