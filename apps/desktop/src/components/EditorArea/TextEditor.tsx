import { EVENT } from '@/constants'
import { captureError } from '@/errorReporting'
import { clipboardRead } from '@/helper/clipboard'
import bus from '@/helper/eventBus'
import {
  delSaveOpenedEditorEntries,
  getFileObject,
  setSaveOpenedEditorEntries,
  updateFileObject,
} from '@/helper/files'
import {
  canvasDataToBinary,
  FileResultCode,
  FileSysResult,
  getFileNameFromPath,
  getFolderPathFromPath,
} from '@/helper/filesys'
import { FileTypeConfig, isTextfileType } from '@/helper/fileTypeHandler'
import { logger } from '@/helper/logger'
import { analyzeMarkdownContent } from '@/helper/markdownInsights'
import { normalizeMarkdownSource } from '@/helper/markdownText'
import { expandHome, findPathCandidates, pathLabel, resolveAgainst } from '@/helper/pathCandidates'
import { speak, speechEngines, stopSpeaking, type SpeechEngine } from '@/helper/speech'
import { openTerminalAt } from '@/helper/terminal'
import { printActiveDocument } from '@/helper/printDocument'
import { debounce, type DebouncedFunc, throttle } from '@/helper/timing'
import { useEditorKeybindingStore } from '@/hooks/useKeyboard'
import { useCommandStore, useEditorStateStore, useEditorStore } from '@/stores'
import useAppSettingStore from '@/stores/useAppSettingStore'
import useEditorCounterStore from '@/stores/useEditorCounterStore'
import useEditorViewTypeStore from '@/stores/useEditorViewTypeStore'
import useOpenedCacheStore from '@/stores/useOpenedCacheStore'
import { invoke } from '@tauri-apps/api/core'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { openPath, openUrl, revealItemInDir } from '@tauri-apps/plugin-opener'
import { save } from '@tauri-apps/plugin-dialog'
import classNames from 'classnames'
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMount, useUnmount } from 'react-use'
import {
  createSourceCodeDelegate,
  EditorChangeEventParams,
  EditorChangeHandler,
  EditorContext,
  EditorRef,
  EditorViewType,
  MfCodemirrorView,
  Editor as MfEditor,
  EditorProps as MfEditorProps,
} from 'rme'
import { toast } from 'zens'
import { toggleContextMenu } from '@/components/ui-v2/ContextMenu'
import { buildEditorContextMenu, readEditorContextTarget } from './editorContextMenu'
import { resolveLocalHref } from '@/helper/localLink'
import { installSublimeSourceEditing } from './sublimeSourceEditing'
import { applySourceLanguage } from './sourceLanguage'
import { createWysiwygDelegateOptions } from './createWysiwygDelegateOptions'
import { createMdviewyWysiwygDelegate } from './createMdviewyWysiwygDelegate'
import { EditorWrapper, normalizeEditorContentWidth } from './EditorWrapper'
import { GitHubMarkdownPreview, requiresSourceSafeEditing } from './GitHubMarkdownPreview'
import { WarningHeader } from './styles'

type SaveHandlerParams = {
  /**
   * when active is true, saveHandler will save the file content to disk.
   * when active is false, saveHandler will save when editor is active.
   */
  active?: boolean
  /** Always ask for a destination, even when the file already has a path. */
  saveAs?: boolean
  onSuccess?: () => void
  onFinally?: () => void
}

enum TextEditorStatus {
  LOADING,
  SUCCESS,
  NOTEXIST,
}

export const sourceCodeCodemirrorViewMap: Map<string, MfCodemirrorView> = new Map()

function TextEditor(props: TextEditorProps) {
  const { id, active, fileTypeConfig } = props
  const curFile = getFileObject(id)
  const createDelegate = useCallback(
    (editorViewType = EditorViewType.WYSIWYG, sourceCodeLanguage?: string) => {
      if (editorViewType === 'sourceCode') {
        return createSourceCodeDelegate({
          language: sourceCodeLanguage,
          disableAllBuildInShortcuts: true,
          overrideShortcutMap: useEditorKeybindingStore.getState().editorKeybingMap,
          clipboardReadFunction: clipboardRead,
          onCodemirrorViewLoad: (cmView) => {
            installSublimeSourceEditing(cmView)
            applySourceLanguage(cmView, curFile.name)
            sourceCodeCodemirrorViewMap.set(id, cmView)
          },
        })
      } else {
        return createMdviewyWysiwygDelegate(createWysiwygDelegateOptions(id))
      }
    },
    [id],
  )
  const [status, setStatus] = useState(TextEditorStatus.LOADING)

  const { setEditorDelegate, setEditorCtx, getEditorContent, insertNodeToFolderData } =
    useEditorStore()
  const { execute } = useCommandStore()
  const { t } = useTranslation()
  const { settingData } = useAppSettingStore()
  const editorViewType = useEditorViewTypeStore(
    (state) => state.editorViewTypeMap.get(id) ?? fileTypeConfig.defaultMode,
  )
  const [content, setContent] = useState<string>()
  const [voices, setVoices] = useState<SpeechEngine[]>([])
  const [delegate, setDelegate] = useState(() =>
    // Non-textfile types (e.g. RTF) reach this editor only through an explicit
    // sourceCode view — build the matching delegate, not the type's default.
    createDelegate(
      isTextfileType(fileTypeConfig) ? fileTypeConfig.defaultMode : editorViewType,
      fileTypeConfig.type,
    ),
  )

  const debounceSaveHandlerCacheRef = useRef<DebouncedFunc<() => Promise<void>>>(null)
  const noFileSaveingRef = useRef(false)
  const editorRef = useRef<EditorRef>(null)
  const editorContextRef = useRef<EditorChangeEventParams>(null)

  const updateEditorCounter = useCallback(
    (markdown: string) => {
      useEditorCounterStore.getState().addEditorCounter({
        id,
        data: analyzeMarkdownContent(markdown),
      })
    },
    [id],
  )

  const debounceUpdateEditorCounter = useMemo(
    () => debounce(updateEditorCounter, 150),
    [updateEditorCounter],
  )

  const refreshTocSoon = useCallback(() => {
    const run = () => {
      if (!active) return
      if (useEditorStore.getState().activeId !== id) return
      execute('app:toc_refresh')
    }

    run()
    requestAnimationFrame(run)
    ;[40, 120, 300].forEach((delay) => window.setTimeout(run, delay))
  }, [active, execute, id])

  useMount(async () => {
    setEditorDelegate(id, delegate)
    // Voices are looked up once; the menu only lists what is installed.
    setVoices(await speechEngines())
  })

  useUnmount(() => {
    debounceUpdateEditorCounter.cancel()
    useEditorCounterStore.getState().deleteEditorCounter({ id })
    const { delIdStateMap } = useEditorStateStore.getState()

    delIdStateMap(id)
  })

  useLayoutEffect(() => {
    let cancelled = false
    const init = async () => {
      const file = curFile
      const t0 = import.meta.env.DEV ? performance.now() : 0
      if (file.path) {
        // Single IPC roundtrip — `get_file_content` already returns NotFound
        // for missing paths.
        const res = await invoke<FileSysResult>('get_file_content', {
          filePath: file.path,
        })
        if (cancelled) return
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.log(
            `[mdviewy.open] ${file.name || file.path} ipc=${(performance.now() - t0).toFixed(1)}ms bytes=${res.content?.length ?? 0}`,
          )
        }
        if (res.code === FileResultCode.NotFound) {
          setStatus(TextEditorStatus.NOTEXIST)
          return
        }
        if (res.code !== FileResultCode.Success) {
          toast.error(res.content)
          return
        }
        const normalized = normalizeMarkdownSource(res.content)
        setContent(normalized)
        updateEditorCounter(normalized)
        void useOpenedCacheStore.getState().addRecentDocument({
          path: file.path,
          name: file.name || getFileNameFromPath(file.path) || file.path,
        })
      } else if (file.content !== undefined) {
        const normalized = normalizeMarkdownSource(file.content)
        setContent(normalized)
        updateEditorCounter(normalized)
      }

      if (!cancelled) {
        setStatus(TextEditorStatus.SUCCESS)
        refreshTocSoon()
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [delegate, curFile, refreshTocSoon, setEditorDelegate, updateEditorCounter])

  const saveHandler = useCallback(
    async (params: SaveHandlerParams = {}) => {
      const { onSuccess, onFinally } = params
      const runFinally = () => {
        onFinally?.()
      }
      const runSuccess = () => {
        try {
          onSuccess?.()
        } finally {
          runFinally()
        }
      }

      if (!active && !params.active) {
        runFinally()
        return
      }
      const curFile = getFileObject(id)
      if (!curFile) {
        runFinally()
        return
      }

      const { idStateMap, setIdStateMap } = useEditorStateStore.getState()

      const curEditorState = idStateMap.get(curFile.id)

      if (!curEditorState?.hasUnsavedChanges && !params.saveAs) {
        runSuccess()
        return
      }

      if (!editorContextRef.current?.state.doc && !curFile.content) {
        // Unexpected
        runFinally()
        return
      }

      const fileContent = editorContextRef.current?.state.doc
        ? delegate.docToString(editorContextRef.current.state.doc)
        : curFile.content

      logger.info('editorContent', fileContent)

      try {
        if (!curFile.path || params.saveAs) {
          if (noFileSaveingRef.current === true) {
            runFinally()
            return
          }

          noFileSaveingRef.current = true
          save({
            title: 'Save File',
            defaultPath: curFile.name ?? `${t('file.untitled')}.md`,
          })
            .then((path) => {
              noFileSaveingRef.current = false

              if (path === null) {
                runFinally()
                return
              }
              invoke<FileSysResult>('write_file', { filePath: path, content: fileContent }).then(
                (res) => {
                  if (res.code !== FileResultCode.Success) {
                    runFinally()
                    return toast.error(res.content)
                  }
                  const filename = getFileNameFromPath(path)
                  updateFileObject(curFile.id, { ...curFile, path, name: filename })
                  insertNodeToFolderData({
                    ...curFile,
                    name: filename,
                    content: fileContent,
                    path,
                  })
                  setIdStateMap(curFile.id, {
                    hasUnsavedChanges: false,
                  })
                  setContent(fileContent)
                  runSuccess()
                },
              ).catch((error) => {
                toast.error(String(error))
                runFinally()
              })
            })
            .catch((error) => {
              noFileSaveingRef.current = false
              toast.error(String(error))
              runFinally()
            })
        } else {
          invoke<FileSysResult>('write_file', {
            filePath: curFile.path,
            content: fileContent,
          }).then((res) => {
            if (res.code !== FileResultCode.Success) {
              runFinally()
              return toast.error(res.content)
            }
            setContent(fileContent)
            setIdStateMap(curFile.id, {
              hasUnsavedChanges: false,
            })
            runSuccess()
          }).catch((error) => {
            toast.error(String(error))
            runFinally()
          })
        }
      } catch (error) {
        toast.error(String(error))
        runFinally()
      }
    },
    [active, id, delegate, t, insertNodeToFolderData],
  )

  const debounceSave = useMemo(() => {
    return debounce(() => saveHandler({ active: true }), settingData.autosave_interval)
  }, [settingData.autosave_interval, saveHandler])

  const debounceRefreshToc = useMemo(
    () => debounce(() => execute('app:toc_refresh'), 1000),
    [execute],
  )

  const debounceSaveHandler = useCallback(() => {
    if (debounceSave) {
      debounceSaveHandlerCacheRef.current?.cancel()

      debounceSaveHandlerCacheRef.current = debounceSave
      debounceSave()
    }
  }, [debounceSave])

  useLayoutEffect(() => {
    setSaveOpenedEditorEntries(id, () => saveHandler({ active: true }))

    return () => {
      delSaveOpenedEditorEntries(id)
    }
  }, [debounceSave])

  const setContentHandler = useCallback(
    (newContent: string) => {
      if (!active) return
      editorRef.current?.setContent(newContent)
      setContent(newContent)
      updateEditorCounter(newContent)
      refreshTocSoon()
      
      // Set save state to unsaved after content change
      const { setIdStateMap } = useEditorStateStore.getState()
      setIdStateMap(id, {
        hasUnsavedChanges: true,
      })
    },
    [active, id, refreshTocSoon, updateEditorCounter],
  )

  const editorTypeSwitchingRef = useRef(false)

  useEffect(() => {
    const cb = throttle((payload: EditorViewType) => {
      if (active) {
        const nextView =
          payload === EditorViewType.WYSIWYG && requiresSourceSafeEditing(content || '')
            ? EditorViewType.SOURCECODE
            : payload
        if (nextView !== payload) {
          toast.error('This document uses GitHub syntax. Opened Source mode to preserve it safely.')
        }
        if (editorTypeSwitchingRef.current) {
          return
        }

        if (editorRef.current?.getType() === nextView) {
          return
        }

        editorTypeSwitchingRef.current = true
        bus.emit(EVENT.app_save, {
          onSuccess: () => {
            if (nextView === EditorViewType.SOURCECODE) {
              const sourceCodeDelegate = createSourceCodeDelegate({
                disableAllBuildInShortcuts: true,
                overrideShortcutMap: useEditorKeybindingStore.getState().editorKeybingMap,
                clipboardReadFunction: clipboardRead,
                onCodemirrorViewLoad: (cmView) => {
                  installSublimeSourceEditing(cmView)
                  applySourceLanguage(cmView, curFile.name)
                  sourceCodeCodemirrorViewMap.set(curFile.id, cmView)
                  setTimeout(() => {
                    execute('app:toc_refresh')
                  })
                },
              })
              setEditorDelegate(curFile.id, sourceCodeDelegate)
              setDelegate(sourceCodeDelegate)
            } else if (nextView === EditorViewType.PREVIEW) {
              debounceRefreshToc()
            } else {
              const wysiwygDelegate = createMdviewyWysiwygDelegate(
                createWysiwygDelegateOptions(curFile.id),
              )
              setEditorDelegate(curFile.id, wysiwygDelegate)
              setDelegate(wysiwygDelegate)
              debounceRefreshToc()
            }
            useEditorViewTypeStore.getState().setEditorViewType(curFile.id, nextView)
            editorRef.current?.toggleType(nextView)
          },
          onFinally: () => {
            editorTypeSwitchingRef.current = false
          },
        })
      }
    }, 300, { leading: true, trailing: false })

    bus.on('editor_toggle_type', cb)

    return () => {
      cb.cancel()
      bus.detach('editor_toggle_type', cb)
    }
  }, [active, content, curFile, execute, setEditorDelegate, getEditorContent, debounceRefreshToc])

  useEffect(() => {
    const exportImageHandler = async () => {
      if (!active) {
        return
      }

      save({
        title: t('contextmenu.editor_tab.export_image'),
        defaultPath: curFile.name.split('.')?.[0] + '.jpg',
      }).then(async (path) => {
        if (!path) return

        const n = toast.loading(t('contextmenu.editor_tab.export_image') + '...')

        const { default: html2canvas } = await import('html2canvas')
        html2canvas(document.getElementById(id) as HTMLElement).then((canvas) => {
          // to base 64
          const image = canvas.toDataURL('image/jpg')

          const data = canvasDataToBinary(image)

          invoke('write_u8_array_to_file', { filePath: path, content: data })
            .then(() => {
              toast.dismiss(n)
              toast.success('Exported to ' + path)
            })
            .catch((error) => {
              toast.dismiss(n)
              toast.error(String(error))
            })
        })
      })
    }

    const exportHtmlHandler = async () => {
      if (!active) {
        return
      }

      save({
        title: t('contextmenu.editor_tab.export_html'),
        defaultPath: curFile.name.split('.')?.[0] + '.html',
      })
        .then(async (path) => {
          if (!path) return

          const n = toast.loading(t('contextmenu.editor_tab.export_html') + '...')
          const res = await editorRef.current?.exportHtml()
          const scStyled = document.head.querySelectorAll('style[data-styled]')

          const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <style>
  ${scStyled[0].innerHTML}
  </style>
  </head>
  <body style="height: 100vh; overflow: auto;">
  <div class="${document.getElementById(id)?.className}">
  ${res}
  </div>
  </body>
  </html>
          `

          invoke('export_html_to_path', { str: html, path }).then(() => {
            toast.dismiss(n)
            toast.success('Exported to ' + path)
          })
        })
        .catch((error) => {
          toast.error(String(error))
        })
    }

    const printPdfHandler = () => {
      if (!active) return
      try {
        printActiveDocument()
      } catch (error) {
        toast.error(String(error))
      }
    }

    bus.on('editor_export_html', exportHtmlHandler)
    bus.on('editor_export_image', exportImageHandler)
    bus.on('editor_print_pdf', printPdfHandler)
    bus.on('editor_set_content', setContentHandler)

    return () => {
      bus.detach('editor_export_html', exportHtmlHandler)
      bus.detach('editor_export_image', exportImageHandler)
      bus.detach('editor_print_pdf', printPdfHandler)
      bus.detach('editor_set_content', setContentHandler)
    }
  }, [active, setContentHandler])

  useEffect(() => {
    if (active) {
      debounceRefreshToc()
    }
  }, [active, debounceRefreshToc])

  useEffect(() => {
    if (active) {
      const { addCommand } = useCommandStore.getState()
      addCommand({
        id: 'app_save',
        handler: () => {
          saveHandler()
        },
      })
      useCommandStore.getState().addCommand({
        id: 'app_saveAs',
        handler: () => {
          saveHandler({ saveAs: true })
        },
      })
    }
  }, [active, saveHandler])

  useEffect(() => {
    const callback = (hooks: SaveHandlerParams) => {
      if (!active) {
        return
      }
      saveHandler({ onSuccess: hooks?.onSuccess, onFinally: hooks?.onFinally })
    }

    bus.on(EVENT.app_save, callback)

    return () => {
      bus.detach(EVENT.app_save, callback)
    }
  }, [active, saveHandler])

  const handleWrapperClick: React.MouseEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      const anchor = (e.target as HTMLElement).closest?.('a[href]') as HTMLAnchorElement | null
      if (anchor && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        const href = anchor.getAttribute('href') || ''
        if (/^(https?:|mailto:)/i.test(href)) {
          void openUrl(href)
        } else {
          const localPath = resolveLocalHref(href, curFile?.path)
          if (localPath) {
            void import('@/services/openPaths').then(({ openPathInApp }) =>
              openPathInApp(localPath).then((opened) => {
                if (!opened)
                  void openPath(localPath).catch(() => toast.error(`Cannot open ${localPath}`))
              }),
            )
          }
        }
        return
      }
      if (
        (e.target as HTMLElement)?.id === 'editorarea-wrapper' ||
        (e.target as HTMLElement).parentElement?.id === 'editorarea-wrapper'
      ) {
        delegate.manager.view.focus()
      }
    },
    [delegate.manager.view, curFile?.path],
  )

  /**
   * Replaces the WebView's default menu (Look Up, Font, Speech, Substitutions,
   * Services ...) with actions that act on the Markdown under the pointer.
   */
  const handleContextMenu: React.MouseEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      const ctx = useEditorStore.getState().editorCtxMap.get(id)
      const commands = (ctx?.commands ?? {}) as Record<string, (attrs?: unknown) => void>
      const selection = window.getSelection()?.toString() ?? ''
      const file = getFileObject(id)

      const baseDir = getFolderPathFromPath(file?.path)
      const home = file?.path?.match(/^\/Users\/[^/]+/)?.[0]
      const paths = findPathCandidates(selection)
        .map((candidate) => resolveAgainst(expandHome(candidate, home), baseDir))
        .map((path) => ({ label: pathLabel(path), path }))

      // Rendered text reads far better aloud than Markdown source would.
      const documentText =
        event.currentTarget.querySelector('.ProseMirror, .cm-content')?.textContent ?? undefined

      const target = readEditorContextTarget(event, {
        selection,
        filePath: file?.path,
        documentText,
      })

      // A clicked link IS a path candidate: `[x](./a.md)` must offer the same
      // Reveal/Terminal actions as a bare path in the text.
      if (target.link) {
        const resolved = resolveLocalHref(target.link.href, file?.path)
        target.link.resolvedPath = resolved
        if (resolved && !paths.some((p) => p.path === resolved)) {
          paths.push({ label: pathLabel(resolved), path: resolved })
        }
      }
      target.paths = paths

      const items = buildEditorContextMenu(target, {
        available: (command) => typeof commands[command] === 'function',
        run: (command, attrs) => commands[command]?.(attrs),
        copy: (text) => {
          void writeText(text)
          toast.success('Copied')
        },
        cut: () => {
          // execCommand('cut') is unreliable in WKWebView; copy, then let the
          // editor delete the selection it still owns.
          void writeText(selection)
          document.execCommand('delete')
        },
        paste: () => {
          if (document.execCommand('paste')) return
          void clipboardRead().then((clipboard) => {
            const text = typeof clipboard === 'string' ? clipboard : clipboard?.text
            if (text) document.execCommand('insertText', false, text)
          })
        },
        pastePlainText: () => {
          void clipboardRead().then((clipboard) => {
            const text = typeof clipboard === 'string' ? clipboard : clipboard?.text
            if (!text) return
            document.execCommand('insertText', false, text)
          })
        },
        findInDocument: (query) => {
          window.dispatchEvent(new CustomEvent('mf:find_replace:open', { detail: { query } }))
        },
        openLink: (href) => {
          if (/^(https?:|mailto:)/i.test(href)) {
            void openUrl(href)
            return
          }
          const localPath = resolveLocalHref(href, file?.path)
          if (!localPath) return
          void import('@/services/openPaths').then(({ openPathInApp }) =>
            openPathInApp(localPath).then((opened) => {
              if (!opened)
                void openPath(localPath).catch(() => toast.error(`Cannot open ${localPath}`))
            }),
          )
        },
        openInApp: async (path) => (await import('@/services/openPaths')).openPathInApp(path),
        revealInFinder: () => {
          if (file?.path) void revealItemInDir(file.path)
        },
        speechEngines: voices,
        speak: (engineId, text) => {
          void speak(engineId, text).catch((error: unknown) => toast.error(String(error)))
        },
        stopSpeaking: () => {
          void stopSpeaking()
        },
        revealPath: (path) => {
          void revealItemInDir(path).catch(() => toast.error(`Not found: ${path}`))
        },
        openPath: (path) => {
          void openPath(path).catch(() => toast.error(`Cannot open ${path}`))
        },
        openPathInTerminal: (path) => {
          const dir = /\.[a-z0-9]+$/i.test(path) ? getFolderPathFromPath(path) : path
          if (dir) void openTerminalAt(dir).catch((error: unknown) => toast.error(String(error)))
        },
        askAgent: (agent, text) => {
          const dir = baseDir || home || '.'
          const prompt = `Regarding ${file?.name ?? 'this document'}: ${text}`
          void openTerminalAt(dir, `${agent} ${JSON.stringify(prompt)}`).then((launch) => {
            if (!launch.ranCommand) {
              void writeText(`${agent} ${JSON.stringify(prompt)}`)
              toast.success(`${launch.id} opened; command on clipboard`)
            }
          })
        },
        replaceSelection: (text) => {
          document.execCommand('insertText', false, text)
        },
        insertText: (text) => {
          document.execCommand('insertText', false, text)
        },
        copyAiPrompt: (text) => {
          const name = file?.name || file?.path || 'this document'
          void writeText(
            [`In ${name} I selected:`, '', text, '', 'Explain it, then propose a concrete improvement.'].join('\n'),
          )
          toast.success('Prompt copied')
        },
      })

      if (!items.length) return

      event.preventDefault()
      event.stopPropagation()
      toggleContextMenu({ x: event.clientX, y: event.clientY, items })
    },
    [id, voices],
  )

  const editorProps: MfEditorProps = useMemo(
    () => ({
      initialType: isTextfileType(fileTypeConfig) ? fileTypeConfig?.defaultMode : editorViewType,
      content: content!,
      delegate,
      style: {
        height: '100%',
      },
      wysiwygTextContainerProps: {
        spellCheck: settingData.wysiwyg_editor_spellcheck,
      },
      sourceCodeTextContainerProps: {
        spellCheck: settingData.source_code_editor_spellcheck,
      },
      // Halved with the wrapper padding: the document should sit close to the
      // window edge, not behind a wide gutter.
      offset: { top: 6, left: 8 },
      styleToken: {
        id,
        rootFontSize: `${settingData.editor_root_font_size}px`,
        rootLineHeight: settingData.editor_root_line_height,
      },
      onContextMounted: (context: EditorContext) => {
        setEditorCtx(id, context)
        refreshTocSoon()
      },
      delegateOptions: createWysiwygDelegateOptions(curFile.id),
      wysiwygToolBarOptions: {
        enable: false,
      },
      errorHandler: {
        onError(params) {
          if (params.error) {
            void captureError(params.error)
          }
        },
      },
    }),
    [content, delegate, setEditorCtx, id, active, settingData, fileTypeConfig, refreshTocSoon],
  )

  const centerActiveCursor = useCallback(() => {
    if (!settingData.editor_typewriter_scroll) return

    requestAnimationFrame(() => {
      const scrollEl = document.querySelector('#editor-panel') as HTMLElement | null
      if (!scrollEl) return

      let cursorTop: number | null = null

      try {
        if (editorRef.current?.getType?.() === EditorViewType.SOURCECODE) {
          const codemirrorView = sourceCodeCodemirrorViewMap.get(id)
          const cm = codemirrorView?.cm
          const head = cm?.state?.selection?.main?.head
          if (cm && typeof head === 'number') {
            cursorTop = cm.coordsAtPos(head)?.top ?? null
          }
        } else {
          const editorView = (delegate as any)?.manager?.view
          const pos = editorView?.state?.selection?.from
          if (typeof pos === 'number') {
            cursorTop = editorView.coordsAtPos(pos)?.top ?? null
          }
        }
      } catch {
        cursorTop = null
      }

      if (cursorTop === null) return

      const containerTop = scrollEl.getBoundingClientRect().top
      const targetTop = scrollEl.scrollTop + cursorTop - containerTop - scrollEl.clientHeight * 0.45
      scrollEl.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' })
    })
  }, [delegate, id, settingData.editor_typewriter_scroll])

  const handleChange: EditorChangeHandler = useCallback(
    (params) => {
      const { tr, helpers } = params
      debounceUpdateEditorCounter(delegate.docToString(params.state.doc))

      if (!active) return
      editorContextRef.current = params
      centerActiveCursor()

      if (tr?.docChanged && !tr.getMeta('APPLY_MARKS')) {
        const state = {
          hasUnsavedChanges: true,
          undoDepth: helpers.undoDepth(),
        }
        const { setIdStateMap } = useEditorStateStore.getState()

        setIdStateMap(id, state)
        debounceRefreshToc()
        const curFile = getFileObject(id)
        if (settingData.autosave && curFile?.path) {
          debounceSaveHandler()
        }
      }
    },
    [
      active,
      centerActiveCursor,
      debounceRefreshToc,
      debounceSaveHandler,
      debounceUpdateEditorCounter,
      delegate,
      id,
      settingData,
    ],
  )

  if (status === TextEditorStatus.NOTEXIST) {
    return <WarningHeader>File is not exist</WarningHeader>
  }

  // Instant feedback while we wait for the file IPC + initial editor parse.
  // Previously returned `null` here → first file-open felt "stuck" for the
  // duration of the read + WYSIWYG mount even though IPC was fast.
  if (typeof content !== 'string') {
    return (
      <div
        className='markdown-body'
        style={{
          padding: '24px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          opacity: 0.55,
          pointerEvents: 'none',
        }}
        aria-hidden='true'
      >
        <div style={{ height: 24, width: '60%', borderRadius: 6, background: 'currentColor', opacity: 0.15 }} />
        <div style={{ height: 12, width: '90%', borderRadius: 4, background: 'currentColor', opacity: 0.1 }} />
        <div style={{ height: 12, width: '85%', borderRadius: 4, background: 'currentColor', opacity: 0.1 }} />
        <div style={{ height: 12, width: '70%', borderRadius: 4, background: 'currentColor', opacity: 0.1 }} />
        <div style={{ height: 18, width: '40%', borderRadius: 5, background: 'currentColor', opacity: 0.12, marginTop: 12 }} />
        <div style={{ height: 12, width: '95%', borderRadius: 4, background: 'currentColor', opacity: 0.1 }} />
        <div style={{ height: 12, width: '88%', borderRadius: 4, background: 'currentColor', opacity: 0.1 }} />
      </div>
    )
  }

  const cls = classNames('markdown-body', {
    'editor-active': active,
  })

  return (
    <EditorWrapper
      id='editorarea-wrapper'
      className={cls}
      contentWidth={normalizeEditorContentWidth(
        settingData.editor_content_width,
        settingData.editor_full_width,
      )}
      data-mdviewy-active-editor={active ? 'true' : 'false'}
      active={active}
      onClick={handleWrapperClick}
      onContextMenu={handleContextMenu}
    >
      <div style={{ height: '100%', display: editorViewType === EditorViewType.PREVIEW ? 'none' : 'block' }}>
        <MfEditor ref={editorRef} onChange={handleChange} {...editorProps} />
      </div>
      {editorViewType === EditorViewType.PREVIEW && (
        <GitHubMarkdownPreview content={content} filePath={curFile.path} />
      )}
    </EditorWrapper>
  )
}

export interface TextEditorProps {
  id: string
  active: boolean
  fileTypeConfig: FileTypeConfig
  onSave?: () => void
}

export default memo(TextEditor)
