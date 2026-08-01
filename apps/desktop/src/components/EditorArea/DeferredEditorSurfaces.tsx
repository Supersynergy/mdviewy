import { useCommandStore } from '@/stores'
import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import type { FindReplaceOpenRequest } from './editorToolBar/FindReplace/find-replace'

const importFindReplace = () => import('./editorToolBar/FindReplace/find-replace')

const FindReplace = lazy(() =>
  importFindReplace().then((mod) => ({
    default: mod.FindReplace,
  })),
)

/**
 * Warms the Find/Replace chunk once the app is idle. It stays out of the
 * startup bundle, but Cmd+F no longer waits for the module to be fetched,
 * parsed, and mounted before the panel appears.
 */
const prefetchFindReplace = () => {
  const warm = () => {
    void importFindReplace()
  }

  if (typeof requestIdleCallback === 'function') {
    const handle = requestIdleCallback(warm, { timeout: 3000 })
    return () => cancelIdleCallback(handle)
  }

  const timer = setTimeout(warm, 1500)
  return () => clearTimeout(timer)
}

export default function DeferredEditorSurfaces() {
  const [findReplaceVisible, setFindReplaceVisible] = useState(false)
  const [findReplaceReady, setFindReplaceReady] = useState(false)
  const [findReplaceRequest, setFindReplaceRequest] = useState<FindReplaceOpenRequest | null>(null)

  const openFindReplace = useCallback(() => {
    setFindReplaceVisible(true)
    setFindReplaceRequest((prev) => ({
      nonce: (prev?.nonce ?? 0) + 1,
    }))
  }, [])

  const handleFindReplaceReady = useCallback(() => {
    setFindReplaceReady(true)
  }, [])

  useEffect(prefetchFindReplace, [])

  useEffect(() => {
    if (findReplaceReady) return

    const { addCommand } = useCommandStore.getState()

    addCommand({ id: 'app_findReplaceEditor', handler: openFindReplace })
    // Find Next/Previous before the panel exists: open it, then the mounted
    // panel replaces these with the real step handlers.
    addCommand({ id: 'app_findNext', handler: openFindReplace })
    addCommand({ id: 'app_findPrev', handler: openFindReplace })

    window.addEventListener('mf:find_replace:open', openFindReplace)
    return () => {
      window.removeEventListener('mf:find_replace:open', openFindReplace)
    }
  }, [findReplaceReady, openFindReplace])

  if (!findReplaceVisible) return null

  return (
    <Suspense fallback={null}>
      <FindReplace
        openRequest={findReplaceRequest}
        onReady={handleFindReplaceReady}
      />
    </Suspense>
  )
}
