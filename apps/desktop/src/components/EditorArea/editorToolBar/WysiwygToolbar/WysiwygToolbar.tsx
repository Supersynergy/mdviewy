import { shortcutFor } from '@/helper/keybindingLabel'
import useGlobalKeyboard from '@/hooks/useKeyboard'
import { useEditorStore } from '@/stores'
import useEditorViewTypeStore from '@/stores/useEditorViewTypeStore'
import useLayoutStore from '@/stores/useLayoutStore'
import { FC, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { EditorViewType } from 'rme'
import styled from 'styled-components'
import { ToolbarSection, usePriorityHidden } from '../responsive'
import { CommandButton } from './CommandButton'
import { AppCommandButton } from './components/AppCommandButton'
import { MenuButton } from './components/MenuButton'
import { SmartActionsButton } from './components/SmartActionsButton'
import { ViewSwitcher } from './components/ViewSwitcher'

const ToolbarWrapper = styled.div`
  background-color: ${({ theme }) => theme.bgColor};
  width: 100%;
  padding: 4px 8px;
  border-bottom: 1px solid ${({ theme }) => theme.borderColor};
  display: flex;
  align-items: center;
  gap: 0;
  z-index: 10;
  flex-wrap: nowrap;
  overflow: hidden;
  box-sizing: border-box;
`

const Divider = styled.div`
  width: 1px;
  height: 20px;
  background-color: ${({ theme }) => theme.borderColor};
  margin: 0 4px;
  flex-shrink: 0;
`

/* Pushes the workspace controls to the trailing edge, away from the writing tools. */
const Spacer = styled.div`
  flex: 1 1 auto;
  min-width: 8px;
`

export const WysiwygToolbar: FC = () => {
  const { editorCtxMap, activeId } = useEditorStore()
  const { getEditorViewType } = useEditorViewTypeStore()
  const { keyboardInfos } = useGlobalKeyboard()
  const { leftBar, rightBar } = useLayoutStore()
  const { t } = useTranslation()

  const editorCtx = editorCtxMap.get(activeId ?? '')
  const viewType = activeId ? getEditorViewType(activeId) : EditorViewType.WYSIWYG

  const sections = useMemo(
    () => [
      { id: 'common', priority: 100 },
      { id: 'panels', priority: 98 },
      { id: 'view', priority: 96 },
      { id: 'history', priority: 90 },
      { id: 'find', priority: 80 },
      { id: 'headings', priority: 60 },
      { id: 'formatting', priority: 50 },
      { id: 'blocks', priority: 30 },
      { id: 'insert', priority: 20 },
    ],
    [],
  )

  const { containerRef, hiddenIds, registerItemWidth } = usePriorityHidden({
    items: sections,
    gap: 0,
  })

  if (!editorCtx || viewType !== EditorViewType.WYSIWYG) {
    return null
  }

  return (
    <ToolbarWrapper ref={containerRef}>
      <ToolbarSection
        id='common'
        registerWidth={registerItemWidth}
        hidden={hiddenIds.has('common')}
      >
        <MenuButton />
        <SmartActionsButton />
      </ToolbarSection>

      <ToolbarSection id='view' registerWidth={registerItemWidth} hidden={hiddenIds.has('view')}>
        <Divider />
        <ViewSwitcher />
      </ToolbarSection>

      <ToolbarSection
        id='history'
        registerWidth={registerItemWidth}
        hidden={hiddenIds.has('history')}
      >
        <Divider />
        <CommandButton
          editorCtx={editorCtx}
          commandName='undo'
          icon='ri-arrow-go-back-line'
          label={t('toolbar.undo') || 'Undo'}
        />
        <CommandButton
          editorCtx={editorCtx}
          commandName='redo'
          icon='ri-arrow-go-forward-line'
          label={t('toolbar.redo') || 'Redo'}
        />
      </ToolbarSection>

      <ToolbarSection
        id='headings'
        registerWidth={registerItemWidth}
        hidden={hiddenIds.has('headings')}
      >
        <Divider />
        <CommandButton
          editorCtx={editorCtx}
          commandName='toggleHeading'
          attrs={{ level: 1 }}
          icon='ri-h-1'
          label={t('toolbar.h1') || 'Heading 1'}
        />
        <CommandButton
          editorCtx={editorCtx}
          commandName='toggleHeading'
          attrs={{ level: 2 }}
          icon='ri-h-2'
          label={t('toolbar.h2') || 'Heading 2'}
        />
        <CommandButton
          editorCtx={editorCtx}
          commandName='toggleHeading'
          attrs={{ level: 3 }}
          icon='ri-h-3'
          label={t('toolbar.h3') || 'Heading 3'}
        />
      </ToolbarSection>

      <ToolbarSection
        id='formatting'
        registerWidth={registerItemWidth}
        hidden={hiddenIds.has('formatting')}
      >
        <Divider />
        <CommandButton
          editorCtx={editorCtx}
          commandName='toggleStrong'
          icon='ri-bold'
          label={t('toolbar.bold') || 'Bold'}
        />
        <CommandButton
          editorCtx={editorCtx}
          commandName='toggleEmphasis'
          icon='ri-italic'
          label={t('toolbar.italic') || 'Italic'}
        />
        <CommandButton
          editorCtx={editorCtx}
          commandName='toggleCodeText'
          icon='ri-code-line'
          label={t('toolbar.code') || 'Inline Code'}
        />
        <CommandButton
          editorCtx={editorCtx}
          commandName='toggleDelete'
          icon='ri-strikethrough'
          label={t('toolbar.strike') || 'Strikethrough'}
        />
      </ToolbarSection>

      <ToolbarSection
        id='blocks'
        registerWidth={registerItemWidth}
        hidden={hiddenIds.has('blocks')}
      >
        <Divider />
        <CommandButton
          editorCtx={editorCtx}
          commandName='toggleBlockquote'
          icon='ri-double-quotes-l'
          label={t('toolbar.quote') || 'Blockquote'}
        />
        <CommandButton
          editorCtx={editorCtx}
          commandName='toggleList'
          attrs={{ kind: 'bullet' }}
          icon='ri-list-unordered'
          label={t('toolbar.bulletList') || 'Bullet List'}
        />
        <CommandButton
          editorCtx={editorCtx}
          commandName='toggleList'
          attrs={{ kind: 'ordered' }}
          icon='ri-list-ordered'
          label={t('toolbar.orderedList') || 'Ordered List'}
        />
        <CommandButton
          editorCtx={editorCtx}
          commandName='toggleList'
          attrs={{ kind: 'task' }}
          icon='ri-checkbox-line'
          label={t('toolbar.taskList') || 'Task List'}
        />
      </ToolbarSection>

      <ToolbarSection id='insert' registerWidth={registerItemWidth} hidden={hiddenIds.has('insert')}>
        <Divider />
        <CommandButton
          editorCtx={editorCtx}
          commandName='createTable'
          attrs={{ rowsCount: 3, columnsCount: 3, withHeaderRow: true }}
          icon='ri-table-2'
          label={t('toolbar.table')}
        />
        <CommandButton
          editorCtx={editorCtx}
          commandName='createCodeMirror'
          icon='ri-code-box-line'
          label={t('toolbar.codeBlock')}
        />
        <CommandButton
          editorCtx={editorCtx}
          commandName='insertHorizontalRule'
          icon='ri-separator'
          label={t('toolbar.horizontalRule')}
        />
      </ToolbarSection>

      <Spacer />

      <ToolbarSection id='find' registerWidth={registerItemWidth} hidden={hiddenIds.has('find')}>
        <AppCommandButton
          commandId='app_findReplaceEditor'
          icon='ri-search-line'
          label={t('toolbar.findReplace')}
          shortcut={shortcutFor(keyboardInfos, 'app_findReplaceEditor')}
        />
      </ToolbarSection>

      <ToolbarSection id='panels' registerWidth={registerItemWidth} hidden={hiddenIds.has('panels')}>
        <AppCommandButton
          commandId='app_toggleLeftsidebarVisible'
          icon='ri-layout-left-line'
          label={t('toolbar.leftSidebar')}
          shortcut={shortcutFor(keyboardInfos, 'app_toggleLeftsidebarVisible')}
          active={leftBar.visible}
        />
        <AppCommandButton
          commandId='app_toggleRightsidebarVisible'
          icon='ri-layout-right-line'
          label={t('toolbar.rightSidebar')}
          shortcut={shortcutFor(keyboardInfos, 'app_toggleRightsidebarVisible')}
          active={rightBar.visible}
        />
      </ToolbarSection>
    </ToolbarWrapper>
  )
}
