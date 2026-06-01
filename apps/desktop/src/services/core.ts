import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'

export type CoreScanEntry = {
  path: string
  isDir: boolean
  size: number
}

export type CoreScanResult = {
  root: string
  entries: CoreScanEntry[]
  total: number
}

export type CoreHeading = { level: number; text: string }

export type CoreFileMeta = {
  path: string
  title: string | null
  tags: string[]
  headings: CoreHeading[]
  body_preview: string
}

export type CoreTocEntry = { level: number; text: string; anchor: string }

export type CoreRenderOutput = {
  html: string
  toc: CoreTocEntry[]
}

export type CoreSearchHit = {
  path: string
  title: string | null
  score: number
  snippet: string
}

export type CoreWatchEvent =
  | { kind: 'add'; path: string }
  | { kind: 'remove'; path: string }
  | { kind: 'modify'; path: string }
  | { kind: 'rename'; from: string; to: string }

export const coreScanFolder = (path: string) =>
  invoke<CoreScanResult>('core_scan_folder', { path })

export const coreExtractMeta = (paths: string[]) =>
  invoke<CoreFileMeta[]>('core_extract_meta', { paths })

export const coreRenderMd = (md: string, theme?: 'light' | 'dark') =>
  invoke<CoreRenderOutput>('core_render_md', { md, theme })

export const coreWatchFolder = (path: string) =>
  invoke<void>('core_watch_folder', { path })

export const coreFtsIndex = (paths: string[]) =>
  invoke<number>('core_fts_index', { paths })

export const coreFtsSearch = (query: string, limit = 20) =>
  invoke<CoreSearchHit[]>('core_fts_search', { query, limit })

export const coreFtsDelete = (path: string) =>
  invoke<void>('core_fts_delete', { path })

export const onCoreWatch = (
  handler: (ev: CoreWatchEvent) => void,
): Promise<UnlistenFn> => listen<CoreWatchEvent>('mdviewy://watch', (e) => handler(e.payload))
