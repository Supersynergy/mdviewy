import { getFileObject } from '@/helper/files'
import { getFileTypeConfig, isTextfileType } from '@/helper/fileTypeHandler'
import { isEmptyEditor } from '@/services/editor-file'
import useEditorViewTypeStore from '@/stores/useEditorViewTypeStore'
import useFileTypeConfigStore from '@/stores/useFileTypeConfigStore'
import type { EditorViewType } from 'rme'
import { memo, useMemo } from 'react'
import { EmptyState } from './EmptyState'
import { PreviewContent } from './preview/PreviewContent'
import TextEditor from './TextEditor'
import { UnsupportedFileType } from './UnsupportedFileType'

const SOURCECODE_VIEW_TYPE = 'sourceCode' as EditorViewType

function Editor(props: EditorProps) {
  const { id, active } = props
  const curFile = getFileObject(id)

  const { getFileTypeConfigById, setFileTypeConfig } = useFileTypeConfigStore()
  // Compute config synchronously from extension. Was an async useMount that
  // forced a `null` render until the next tick — instant file-open instead.
  const curFileTypeConfig = useMemo(() => {
    const cached = getFileTypeConfigById(id)
    if (cached) return cached
    const computed = getFileTypeConfig(curFile)
    useEditorViewTypeStore.getState().setEditorViewType(curFile.id, computed.defaultMode)
    setFileTypeConfig(curFile.id, computed)
    return computed
  }, [id, curFile, getFileTypeConfigById, setFileTypeConfig])

  // Non-markdown types can expose a sourceCode mode (e.g. RTF raw source) even
  // though they aren't "textfile" types — routing must look at the live mode,
  // not only the type.
  const viewType = useEditorViewTypeStore(
    (state) => state.editorViewTypeMap.get(id) ?? curFileTypeConfig.defaultMode,
  )

  if (isEmptyEditor(curFile.id)) {
    if (active) {
      return <EmptyState />
    } else {
      return null
    }
  }

  if (!curFileTypeConfig) return null

  const useTextEditor =
    isTextfileType(curFileTypeConfig) ||
    (viewType === SOURCECODE_VIEW_TYPE &&
      curFileTypeConfig.supportedModes.includes(SOURCECODE_VIEW_TYPE))

  return (
    <div className={'code-contents'} style={active ? undefined : { display: 'none' }}>
      {curFileTypeConfig.type === 'unsupported' ? (
        <UnsupportedFileType />
      ) : useTextEditor ? (
        <TextEditor fileTypeConfig={curFileTypeConfig} active={active} id={id} />
      ) : (
        <PreviewContent type={curFileTypeConfig.type} filePath={curFile.path} active={active} />
      )}
    </div>
  )
}

export interface EditorProps {
  id: string
  active: boolean
  onSave?: () => void
}

export default memo(Editor)
