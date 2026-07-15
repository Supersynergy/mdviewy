import useAppSettingStore from '@/stores/useAppSettingStore'
import type { EditorViewType } from 'rme'
import { IFile } from './filesys'

// Sync extname — was using @tauri-apps/api/path which does an IPC roundtrip
// per file open just to parse the extension. Trivial string work, no need.
function extname(p: string): string {
  const last = p.lastIndexOf('.')
  if (last < 0) return ''
  const slash = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))
  if (last < slash) return ''
  return p.slice(last + 1)
}

export type FileType = 'markdown' | 'image' | 'json' | 'text' | 'unsupported'

const VIEW_PREVIEW = 'preview' as EditorViewType
const VIEW_WYSIWYG = 'wysiwyg' as EditorViewType
const VIEW_SOURCECODE = 'sourceCode' as EditorViewType

export interface FileTypeConfig {
  type: FileType
  supportedModes: Array<EditorViewType>
  defaultMode: EditorViewType
  exporters?: Array<string>
}

export const isTextfileType = (fileTypeConfig: FileTypeConfig): boolean => {
  return ['markdown', 'json', 'text'].includes(fileTypeConfig.type)
}

export function getFileTypeConfig(file: IFile): FileTypeConfig {
  const ext = extname(file.path || file.name || '')
  const fileName = (file.path || file.name || '').split(/[\\/]/).pop() || ''
  const isReadme = /^readme(?:\.[^.]+)?\.(?:md|markdown)$/i.test(fileName)
  const { settingData } = useAppSettingStore.getState()

  const markdownFileType: FileTypeConfig = {
    type: 'markdown',
    supportedModes: [VIEW_PREVIEW, VIEW_WYSIWYG, VIEW_SOURCECODE],
    defaultMode: isReadme ? VIEW_PREVIEW : settingData.md_editor_default_mode || VIEW_WYSIWYG,
    exporters: ['Html', 'Image', 'Pdf'],
  }

  const fileTypeConfigs: Record<string, FileTypeConfig> = {
    md: markdownFileType,
    markdown: markdownFileType,
    json: {
      type: 'json',
      supportedModes: [VIEW_SOURCECODE],
      defaultMode: VIEW_SOURCECODE,
    },
    txt: {
      type: 'text',
      supportedModes: [VIEW_SOURCECODE],
      defaultMode: VIEW_SOURCECODE,
    },
    jpg: {
      type: 'image',
      supportedModes: [VIEW_PREVIEW],
      defaultMode: VIEW_PREVIEW,
    },
    jpeg: {
      type: 'image',
      supportedModes: [VIEW_PREVIEW],
      defaultMode: VIEW_PREVIEW,
    },
    png: {
      type: 'image',
      supportedModes: [VIEW_PREVIEW],
      defaultMode: VIEW_PREVIEW,
    },
    gif: {
      type: 'image',
      supportedModes: [VIEW_PREVIEW],
      defaultMode: VIEW_PREVIEW,
    },
  }

  const tar = fileTypeConfigs[ext.toLowerCase()]
  return (
    tar || {
      type: 'unsupported',
      supportedModes: [VIEW_SOURCECODE],
      defaultMode: VIEW_SOURCECODE,
    }
  )
}

export function isSupportedMode(config: FileTypeConfig, mode: string): boolean {
  return config.supportedModes.includes(mode as any)
}
