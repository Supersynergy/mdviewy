import { isHandoffFile } from './handoff'
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

export type FileType = 'markdown' | 'image' | 'json' | 'text' | 'rtf' | 'pdf' | 'unsupported'

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

// Text/code extensions that open in the source editor. Mirrors the extension
// lists in @codemirror/language-data (kept static so this module stays free of
// CodeMirror imports — it is loaded on the startup path).
const CODE_EXTENSIONS = new Set([
  'js', 'mjs', 'cjs', 'jsx', 'ts', 'mts', 'cts', 'tsx',
  'py', 'pyw', 'pyx', 'rs', 'go', 'java', 'c', 'h', 'cpp', 'c++', 'cc', 'cxx',
  'hpp', 'h++', 'hh', 'hxx', 'cs', 'fs', 'rb', 'rbx', 'php', 'php3', 'php4',
  'php5', 'php7', 'phtml', 'swift', 'kt', 'kts', 'scala', 'sc', 'lua', 'pl',
  'pm', 'r', 'jl', 'dart', 'ex', 'exs', 'erl', 'hrl', 'hs', 'clj', 'cljc',
  'cljs', 'edn', 'elm', 'd', 'cr', 'groovy', 'gradle', 'hx', 'ml', 'mli',
  'html', 'htm', 'xhtml', 'handlebars', 'hbs', 'xml', 'xsl', 'xsd', 'dtd',
  'css', 'scss', 'sass', 'less', 'gss', 'styl', 'vue', 'liquid', 'j2',
  'jinja', 'jinja2', 'jsonc', 'json5', 'jsonld', 'yaml', 'yml', 'toml',
  'ini', 'cfg', 'conf', 'properties', 'env', 'sh', 'bash', 'zsh', 'ps1',
  'bat', 'cmd', 'sql', 'cql', 'pls', 'prql', 'sparql', 'diff', 'patch',
  'dockerfile', 'cmake', 'mk', 'wat', 'wast', 'tex', 'sty', 'v', 'sv',
  'vhdl', 'lua', 'vim', 'feature', 'cypher', 'asn', 'asn1', 'e', 'forth',
  'fth', '4th', 'f', 'for', 'f77', 'f90', 'f95', 's', 'cob', 'cpy', 'dylan',
  'dyl', 'factor', 'lisp', 'cl', 'el', 'mrc', 'idl', 'ls', 'nsis', 'nsh',
  'oz', 'pig', 'pas', 'pp', 'sol', 'tcl', 'vbs', 'vb', 'sieve', 'nt', 'brf',
])

// Plain-text extensions with no grammar — still worth a source view.
const PLAIN_TEXT_EXTENSIONS = new Set([
  'txt', 'text', 'mdx', 'log', 'csv', 'tsv', 'asc', 'me', 'nfo', 'out', 'err',
  'lock', 'graphql', 'gql', 'prisma', 'proto', 'thrift', 'rego', 'bicep',
  'tf', 'hcl', 'nomad', 'service', 'desktop', 'po', 'pot', 'rst', 'adoc',
  'org', 'srt', 'vtt', 'ics', 'vcf', 'wkt', 'ndjson', 'jsonl',
])

// Extensionless names / dotfiles that resolve to a language or plain text.
const FILE_NAME_LANGUAGES = new Set([
  'dockerfile', 'makefile', 'gnumakefile', 'cmakelists.txt', 'rakefile',
  'gemfile', 'podfile', 'brewfile', 'vagrantfile', 'justfile', 'procfile',
  '.gitignore', '.dockerignore', '.gitattributes', '.gitmodules', '.npmrc',
  '.editorconfig', '.env', '.zshrc', '.bashrc', '.zprofile', '.profile',
  '.prettierrc', '.eslintrc', '.babelrc', 'license', 'licence', 'copying',
  'changelog', 'authors', 'contributors', 'notice', 'readme',
])

const IMAGE_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'avif', 'ico', 'tif', 'tiff',
])

// Extensions offered by the File ▸ Open dialog and used to decide whether an
// arbitrary path can be opened as a document at all.
export const OPEN_DIALOG_EXTENSIONS: string[] = [
  'md', 'markdown', 'json', 'rtf', 'pdf',
  ...IMAGE_EXTENSIONS,
  ...CODE_EXTENSIONS,
  ...PLAIN_TEXT_EXTENSIONS,
]

const textFileType = (): FileTypeConfig => ({
  type: 'text',
  supportedModes: [VIEW_SOURCECODE],
  defaultMode: VIEW_SOURCECODE,
})

export function getFileTypeConfig(file: IFile): FileTypeConfig {
  const ext = extname(file.path || file.name || '').toLowerCase()
  const fileName = (file.path || file.name || '').split(/[\\/]/).pop() || ''
  const isReadme = /^readme(?:\.[^.]+)?\.(?:md|markdown)$/i.test(fileName)
  const { settingData } = useAppSettingStore.getState()

  const markdownFileType: FileTypeConfig = {
    type: 'markdown',
    supportedModes: [VIEW_PREVIEW, VIEW_WYSIWYG, VIEW_SOURCECODE],
    defaultMode: isHandoffFile(fileName) ? VIEW_SOURCECODE : isReadme ? VIEW_PREVIEW : settingData.md_editor_default_mode || VIEW_WYSIWYG,
    exporters: ['Html', 'Image', 'Pdf'],
  }

  switch (ext) {
    case 'md':
    case 'markdown':
      return markdownFileType
    case 'json':
      return {
        type: 'json',
        supportedModes: [VIEW_SOURCECODE],
        defaultMode: VIEW_SOURCECODE,
      }
    case 'rtf':
      return {
        type: 'rtf',
        supportedModes: [VIEW_PREVIEW, VIEW_SOURCECODE],
        defaultMode: VIEW_PREVIEW,
      }
    case 'pdf':
      return {
        type: 'pdf',
        supportedModes: [VIEW_PREVIEW],
        defaultMode: VIEW_PREVIEW,
      }
  }

  if (IMAGE_EXTENSIONS.has(ext)) {
    return {
      type: 'image',
      supportedModes: [VIEW_PREVIEW],
      defaultMode: VIEW_PREVIEW,
    }
  }

  if (
    CODE_EXTENSIONS.has(ext) ||
    PLAIN_TEXT_EXTENSIONS.has(ext) ||
    FILE_NAME_LANGUAGES.has(fileName.toLowerCase())
  ) {
    return textFileType()
  }

  return {
    type: 'unsupported',
    supportedModes: [VIEW_SOURCECODE],
    defaultMode: VIEW_SOURCECODE,
  }
}

export function isSupportedMode(config: FileTypeConfig, mode: string): boolean {
  return config.supportedModes.includes(mode as any)
}
