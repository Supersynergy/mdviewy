import { useCommandStore } from '@/stores'
import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import type { FindReplaceOpenRequest } from './editorToolBar/FindReplace/find-replace'

const FindReplace = lazy(() =>
  import('./editorToolBar/FindReplace/find-replace').then((mod) => ({
    default: mod.FindReplace,
  })),
)

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

  useEffect(() => {
    if (findReplaceReady) return

    useCommandStore.getState().addCommand({
      id: 'app_findReplaceEditor',
      handler: openFindReplace,
    })

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
