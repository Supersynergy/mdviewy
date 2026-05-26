import '@/antdStyles'
import { useCommandStore, useEditorStore } from '@/stores'
import type { FC } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { FindReplaceComponent } from './find-replace-component'

export interface FindReplaceOpenRequest {
  nonce: number
}

interface FindReplaceProps {
  openRequest?: FindReplaceOpenRequest | null
  onReady?: () => void
}

function useFindReplaceOpen(openRequest?: FindReplaceOpenRequest | null, onReady?: () => void) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { addCommand, execute } = useCommandStore()

  const openFindReplace = useCallback(() => {
    setOpen((prev) => {
      if (!prev) {
        execute('app_stopFindEditor')
      }
      return true
    })
  }, [execute])

  const toggleFindReplace = useCallback(() => {
    setOpen((prev) => {
      if (!prev) {
        execute('app_stopFindEditor')
      }
      return !prev
    })
  }, [execute])

  useEffect(() => {
    addCommand({
      id: 'app_findReplaceEditor',
      handler: toggleFindReplace,
    })
  }, [addCommand, toggleFindReplace])

  useEffect(() => {
    onReady?.()
  }, [onReady])

  useEffect(() => {
    if (openRequest) {
      openFindReplace()
    }
  }, [openFindReplace, openRequest])

  const focus = useCallback(() => {
    const input = ref.current?.querySelector('input')
    if (input && document.activeElement !== input) {
      input.focus()
      return true
    }
    return false
  }, [])

  useEffect(() => {
    if (open) {
      focus()
    }
  }, [focus, open])

  const close = useCallback(() => {
    setOpen(false)
  }, [])

  return { open, ref, close }
}

const FindReplaceWrapper = styled.div`
  position: sticky;
  left: 0;
  right: 0;
  top: 200;
  background-color: ${({ theme }) => theme.bgColor};
  backdrop-filter: blur(8px);
  width: '100%';
  padding: 8px;
`

export const FindReplace: FC<FindReplaceProps> = ({ openRequest, onReady }) => {
  const { open, ref, close } = useFindReplaceOpen(openRequest, onReady)
  const { editorCtxMap, activeId } = useEditorStore()

  const editorCtx = editorCtxMap.get(activeId ?? '')

  if (!open || !editorCtx || !editorCtx.helpers.findRanges) return null

  return (
      <FindReplaceWrapper ref={ref}>
        <FindReplaceComponent onDismiss={close} editorCtx={editorCtx} />
      </FindReplaceWrapper>
  )
}
