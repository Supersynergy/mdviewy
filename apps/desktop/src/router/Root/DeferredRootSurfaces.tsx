import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import type { CommandPaletteOpenRequest } from '@/components/CommandPalette'

type CommandPaletteMode = CommandPaletteOpenRequest['mode']

const AppInfoDialog = lazy(() => import('@/components/AppInfoDialog'))
const CommandPalette = lazy(() => import('@/components/CommandPalette'))
const WorkspaceDialog = lazy(() =>
  import('@/components/WorkspaceDialog').then((mod) => ({ default: mod.WorkspaceDialog })),
)
const BookMarkDialog = lazy(() =>
  import('@/extensions/bookmarks/BookMarkDialog').then((mod) => ({ default: mod.BookMarkDialog })),
)
const SettingDialog = lazy(() =>
  import('../Setting/component/SettingDialog').then((mod) => ({ default: mod.SettingDialog })),
)

const isCommandPaletteMode = (value: unknown): value is CommandPaletteMode =>
  value === 'all' || value === 'files' || value === 'content' || value === 'commands'

export default function DeferredRootSurfaces() {
  const [ready, setReady] = useState(false)
  const [commandPaletteReady, setCommandPaletteReady] = useState(false)
  const [commandPaletteRequest, setCommandPaletteRequest] =
    useState<CommandPaletteOpenRequest | null>(null)

  const openCommandPalette = useCallback((mode: CommandPaletteMode) => {
    setReady(true)
    setCommandPaletteRequest((prev) => ({
      mode,
      nonce: (prev?.nonce ?? 0) + 1,
    }))
  }, [])

  const handleCommandPaletteReady = useCallback(() => {
    setCommandPaletteReady(true)
  }, [])

  useEffect(() => {
    const load = () => setReady(true)

    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(load, { timeout: 1500 })
      return () => window.cancelIdleCallback(id)
    }

    const id = globalThis.setTimeout(load, 500)
    return () => globalThis.clearTimeout(id)
  }, [])

  useEffect(() => {
    if (commandPaletteReady) return

    const openFromEvent = (event: Event) => {
      const detail = (event as CustomEvent).detail
      openCommandPalette(isCommandPaletteMode(detail) ? detail : 'all')
    }

    const openFromShortcut = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey
      if (!mod) return

      const key = event.key.toLowerCase()
      if (key === 'k' && !event.shiftKey) {
        event.preventDefault()
        openCommandPalette('all')
      } else if (key === 'p' && !event.shiftKey) {
        event.preventDefault()
        openCommandPalette('files')
      } else if (key === 'p' && event.shiftKey) {
        event.preventDefault()
        openCommandPalette('commands')
      }
    }

    window.addEventListener('mf:cmd_palette:open', openFromEvent as EventListener)
    window.addEventListener('keydown', openFromShortcut)
    return () => {
      window.removeEventListener('mf:cmd_palette:open', openFromEvent as EventListener)
      window.removeEventListener('keydown', openFromShortcut)
    }
  }, [commandPaletteReady, openCommandPalette])

  if (!ready) return null

  return (
    <Suspense fallback={null}>
      <AppInfoDialog />
      <BookMarkDialog />
      <SettingDialog />
      <WorkspaceDialog />
      <CommandPalette
        openRequest={commandPaletteRequest}
        onReady={handleCommandPaletteReady}
      />
    </Suspense>
  )
}
