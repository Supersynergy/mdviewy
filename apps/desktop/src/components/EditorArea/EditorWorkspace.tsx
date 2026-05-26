import { FindReplace } from '@/components/EditorArea/editorToolBar/FindReplace'
import { PreviewToolbar } from '@/components/EditorArea/editorToolBar/PreviewToolbar/PreviewToolbar'
import { SourceCodeToolbar } from '@/components/EditorArea/editorToolBar/SourceCodeToolbar/SourceCodeToolbar'
import { WysiwygToolbar } from '@/components/EditorArea/editorToolBar/WysiwygToolbar'
import { editorResources } from '@/i18n'
import useAppSettingStore from '@/stores/useAppSettingStore'
import useThemeStore from '@/stores/useThemeStore'
import { useMemo } from 'react'
import { ThemeProvider as EditorProvider } from 'rme'
import Editor from './Editor'
import EditorAreaTabs from './EditorAreaTabs'
import { Container, EditorPanel } from './styles'

interface EditorWorkspaceProps {
  opened: string[]
  activeId?: string
}

export default function EditorWorkspace({ opened, activeId }: EditorWorkspaceProps) {
  const { curTheme } = useThemeStore()
  const { settingData } = useAppSettingStore()

  const themeProp = useMemo(
    () => ({
      mode: curTheme.mode,
      token: {
        ...curTheme.styledConstants,
        fontFamily: settingData.editor_root_font_family,
        codemirrorFontFamily: settingData.editor_code_font_family,
      },
    }),
    [
      curTheme.mode,
      curTheme.styledConstants,
      settingData.editor_root_font_family,
      settingData.editor_code_font_family,
    ],
  )

  const i18nProp = useMemo(
    () => ({
      locales: editorResources,
      language: settingData.language,
    }),
    [settingData.language],
  )

  return (
    <EditorProvider theme={themeProp} i18n={i18nProp}>
      <Container className='w-full h-full'>
        <EditorAreaTabs />
        <WysiwygToolbar />
        <SourceCodeToolbar />
        <PreviewToolbar />
        <FindReplace />
        <EditorPanel id='editor-panel'>
          {opened.map((id) => {
            return <Editor key={id} id={id} active={id === activeId} />
          })}
        </EditorPanel>
      </Container>
    </EditorProvider>
  )
}
