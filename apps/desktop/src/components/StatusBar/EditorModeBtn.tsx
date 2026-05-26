import { EVENT } from '@/constants'
import { useCommandStore, useEditorStore } from '@/stores'
import useEditorViewTypeStore from '@/stores/useEditorViewTypeStore'
import { memo, useCallback } from 'react'
import { EditorViewType } from 'rme'
import styled from 'styled-components'
import { Tooltip } from 'zens'

const Btn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  background: transparent;
  cursor: pointer;
  padding: 6px 10px;
  font-size: 0.78rem;
  color: ${(p) => p.theme.labelFontColor};
  font-family: inherit;
  border-radius: 6px;
  transition: background 120ms ease, color 120ms ease;

  &:hover {
    background: ${(p) => p.theme.hoverColor};
    color: ${(p) => p.theme.primaryFontColor};
  }

  i {
    font-size: 0.85rem;
  }

  kbd {
    margin-left: 4px;
    font-family: 'SF Mono', monospace;
    font-size: 0.65rem;
    color: ${(p) => p.theme.labelFontColor};
    opacity: 0.7;
  }
`

export const EditorModeBtn = memo(() => {
  const { activeId } = useEditorStore()
  const { editorViewTypeMap } = useEditorViewTypeStore()
  const execute = useCommandStore((s) => s.execute)

  const toggle = useCallback(() => {
    execute(EVENT.app_toggleEditorType)
  }, [execute])

  if (!activeId) return null

  const cur = editorViewTypeMap.get(activeId) ?? EditorViewType.WYSIWYG
  const isWys = cur === EditorViewType.WYSIWYG

  return (
    <Tooltip title={isWys ? 'Switch to Source (Cmd+Shift+M)' : 'Switch to Pretty (Cmd+Shift+M)'}>
      <Btn onClick={toggle}>
        <i className={isWys ? 'ri-quill-pen-line' : 'ri-code-s-slash-line'} />
        {isWys ? 'Pretty' : 'Source'}
        <kbd>Cmd+Shift+M</kbd>
      </Btn>
    </Tooltip>
  )
})

EditorModeBtn.displayName = 'EditorModeBtn'
