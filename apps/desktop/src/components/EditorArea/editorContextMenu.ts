import type { MenuItemData } from 'zens'

/**
 * What the pointer was over when the menu opened. Everything the menu offers
 * has to come from this — an entry that cannot act on the current target is
 * noise, and the WebKit default menu is already full of that.
 */
export type EditorContextTarget = {
  selection: string
  link?: { href: string; text: string }
  image?: { src: string }
  inCodeBlock: boolean
  inTable: boolean
  filePath?: string
  /** Paths found in the selection or the clicked line, already resolved. */
  paths?: Array<{ label: string; path: string }>
}

export type SpeechChoice = { id: string; label: string; detail?: string }

export type EditorContextActions = {
  /** Names of the editor commands that exist on this document. */
  available: (command: string) => boolean
  run: (command: string, attrs?: Record<string, unknown>) => void
  copy: (text: string) => void
  cut: () => void
  paste: () => void
  pastePlainText: () => void
  findInDocument: (query: string) => void
  openLink: (href: string) => void
  revealInFinder: () => void
  copyAiPrompt: (selection: string) => void
  /** Voices installed on this machine; empty hides the speech group. */
  speechEngines: SpeechChoice[]
  speak: (engineId: string, text: string) => void
  stopSpeaking: () => void
  revealPath: (path: string) => void
  openPath: (path: string) => void
  openPathInTerminal: (path: string) => void
  askAgent: (agent: 'claude' | 'codex', text: string) => void
  replaceSelection: (text: string) => void
  insertText: (text: string) => void
}

const divider = { type: 'divider' as const }

/** `Cmd` on macOS, `Ctrl` elsewhere — the menu shows what the user would press. */
const modifier = () =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent) ? 'Cmd' : 'Ctrl'

const truncate = (value: string, max = 32) => {
  const flat = value.replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat
}

/**
 * Builds the editor context menu for one right-click.
 *
 * Rules that keep it useful:
 * - only entries whose command exists (`available`) are added, so nothing is dead;
 * - the target decides the top group — link, image, table, code block, selection;
 * - formatting and block conversion live one level deep, everything else is flat.
 */
export const buildEditorContextMenu = (
  target: EditorContextTarget,
  actions: EditorContextActions,
): MenuItemData[] => {
  const items: MenuItemData[] = []
  const mod = modifier()
  const hasSelection = target.selection.trim().length > 0

  if (target.link) {
    const { href, text } = target.link
    items.push(
      { label: `Open ${truncate(href, 40)}`, value: 'link-open', handler: () => actions.openLink(href) },
      { label: 'Copy link address', value: 'link-copy', handler: () => actions.copy(href) },
    )
    if (text.trim()) {
      items.push({ label: 'Copy link text', value: 'link-copy-text', handler: () => actions.copy(text) })
    }
    items.push(divider)
  }

  if (target.image) {
    const { src } = target.image
    items.push(
      { label: 'Copy image path', value: 'image-copy-path', handler: () => actions.copy(src) },
      divider,
    )
  }

  if (target.inTable) {
    const tableItems: MenuItemData[] = []
    const tableCommands: Array<[string, string]> = [
      ['addTableRowBefore', 'Row above'],
      ['addTableRowAfter', 'Row below'],
      ['addTableColumnBefore', 'Column left'],
      ['addTableColumnAfter', 'Column right'],
    ]
    for (const [command, label] of tableCommands) {
      if (actions.available(command)) {
        tableItems.push({ label, value: command, handler: () => actions.run(command) })
      }
    }

    const removals: Array<[string, string]> = [
      ['deleteTableRow', 'Delete row'],
      ['deleteTableColumn', 'Delete column'],
      ['deleteTable', 'Delete table'],
    ]
    const removalItems = removals
      .filter(([command]) => actions.available(command))
      .map(([command, label]) => ({ label, value: command, handler: () => actions.run(command) }))

    if (tableItems.length || removalItems.length) {
      items.push({
        label: 'Table',
        value: 'table',
        children: removalItems.length
          ? [...tableItems, divider, ...removalItems]
          : tableItems,
      })
      items.push(divider)
    }
  }

  if (target.inCodeBlock && hasSelection) {
    items.push(
      { label: 'Copy code selection', value: 'code-copy', handler: () => actions.copy(target.selection) },
      divider,
    )
  }

  if (hasSelection) {
    items.push(
      { label: 'Cut', value: 'cut', shortcut: `${mod}+X`, handler: actions.cut },
      { label: 'Copy', value: 'copy', shortcut: `${mod}+C`, handler: () => actions.copy(target.selection) },
    )
  }

  items.push(
    { label: 'Paste', value: 'paste', shortcut: `${mod}+V`, handler: actions.paste },
    {
      label: 'Paste as plain text',
      value: 'paste-plain',
      shortcut: `${mod}+Shift+V`,
      handler: actions.pastePlainText,
    },
  )

  if (hasSelection && !target.inCodeBlock) {
    const format: MenuItemData[] = []
    const formatCommands: Array<[string, string, string?]> = [
      ['toggleStrong', 'Bold', `${mod}+B`],
      ['toggleEmphasis', 'Italic', `${mod}+I`],
      ['toggleCodeText', 'Inline code'],
      ['toggleDelete', 'Strikethrough'],
    ]
    for (const [command, label, shortcut] of formatCommands) {
      if (actions.available(command)) {
        format.push({ label, value: command, shortcut, handler: () => actions.run(command) })
      }
    }
    if (format.length) {
      items.push(divider, { label: 'Format', value: 'format', children: format })
    }

    const convert: MenuItemData[] = []
    if (actions.available('toggleHeading')) {
      for (const level of [1, 2, 3]) {
        convert.push({
          label: `Heading ${level}`,
          value: `heading-${level}`,
          handler: () => actions.run('toggleHeading', { level }),
        })
      }
    }
    if (actions.available('toggleList')) {
      convert.push(
        { label: 'Bullet list', value: 'list-bullet', handler: () => actions.run('toggleList', { kind: 'bullet' }) },
        { label: 'Numbered list', value: 'list-ordered', handler: () => actions.run('toggleList', { kind: 'ordered' }) },
        { label: 'Task list', value: 'list-task', handler: () => actions.run('toggleList', { kind: 'task' }) },
      )
    }
    if (actions.available('toggleBlockquote')) {
      convert.push({ label: 'Quote', value: 'quote', handler: () => actions.run('toggleBlockquote') })
    }
    if (actions.available('createCodeMirror')) {
      convert.push({ label: 'Code block', value: 'code-block', handler: () => actions.run('createCodeMirror') })
    }
    if (convert.length) {
      items.push({ label: 'Turn into', value: 'turn-into', children: convert })
    }
  }

  if (!hasSelection) {
    const insert: MenuItemData[] = []
    if (actions.available('createTable')) {
      insert.push({
        label: 'Table',
        value: 'insert-table',
        handler: () => actions.run('createTable', { rowsCount: 3, columnsCount: 3, withHeaderRow: true }),
      })
    }
    if (actions.available('createCodeMirror')) {
      insert.push({ label: 'Code block', value: 'insert-code', handler: () => actions.run('createCodeMirror') })
    }
    if (actions.available('insertHorizontalRule')) {
      insert.push({ label: 'Divider', value: 'insert-rule', handler: () => actions.run('insertHorizontalRule') })
    }
    if (insert.length) {
      items.push(divider, { label: 'Insert', value: 'insert', children: insert })
    }
  }

  items.push(divider)

  if (hasSelection) {
    items.push(
      {
        label: `Find “${truncate(target.selection, 24)}”`,
        value: 'find-selection',
        shortcut: `${mod}+F`,
        handler: () => actions.findInDocument(target.selection),
      },
      {
        label: 'Copy as AI prompt',
        value: 'copy-ai-prompt',
        handler: () => actions.copyAiPrompt(target.selection),
      },
    )
  } else {
    items.push({
      label: 'Find in document',
      value: 'find',
      shortcut: `${mod}+F`,
      handler: () => actions.findInDocument(''),
    })
  }

  if (hasSelection && actions.speechEngines.length > 0) {
    const voices: MenuItemData[] = actions.speechEngines.map((engine) => ({
      label: engine.detail ? `${engine.label} — ${engine.detail}` : engine.label,
      value: `speak-${engine.id}`,
      handler: () => actions.speak(engine.id, target.selection),
    }))

    items.push({
      label: 'Speak selection',
      value: 'speak',
      children: [...voices, divider, { label: 'Stop speaking', value: 'speak-stop', handler: actions.stopSpeaking }],
    })
  }

  if (hasSelection && actions.available('insertText')) {
    const lines = target.selection.split('\n').filter((line) => line.trim().length > 0)
    if (lines.length > 1) {
      items.push({
        label: 'Lines',
        value: 'lines',
        children: [
          {
            label: 'Sort A → Z',
            value: 'lines-sort',
            handler: () =>
              actions.replaceSelection([...lines].sort((a, b) => a.localeCompare(b)).join('\n')),
          },
          {
            label: 'Sort Z → A',
            value: 'lines-sort-desc',
            handler: () =>
              actions.replaceSelection([...lines].sort((a, b) => b.localeCompare(a)).join('\n')),
          },
          {
            label: 'Remove duplicates',
            value: 'lines-dedupe',
            handler: () => actions.replaceSelection([...new Set(lines)].join('\n')),
          },
          {
            label: 'Reverse',
            value: 'lines-reverse',
            handler: () => actions.replaceSelection([...lines].reverse().join('\n')),
          },
        ],
      })
    }
  }

  if (hasSelection) {
    items.push({
      label: 'Ask an agent',
      value: 'ask-agent',
      children: [
        {
          label: 'Claude Code',
          value: 'ask-claude',
          handler: () => actions.askAgent('claude', target.selection),
        },
        {
          label: 'Codex',
          value: 'ask-codex',
          handler: () => actions.askAgent('codex', target.selection),
        },
      ],
    })
  }

  if (target.paths?.length) {
    items.push(divider)
    for (const entry of target.paths.slice(0, 5)) {
      items.push({
        label: entry.label,
        value: `path-${entry.path}`,
        children: [
          { label: 'Reveal in Finder', value: 'path-reveal', handler: () => actions.revealPath(entry.path) },
          { label: 'Open', value: 'path-open', handler: () => actions.openPath(entry.path) },
          {
            label: 'Open terminal here',
            value: 'path-terminal',
            handler: () => actions.openPathInTerminal(entry.path),
          },
          { label: 'Copy path', value: 'path-copy', handler: () => actions.copy(entry.path) },
        ],
      })
    }
  }

  if (!hasSelection && actions.available('insertText')) {
    items.push({
      label: 'Insert today’s date',
      value: 'insert-date',
      handler: () => actions.insertText(new Date().toISOString().slice(0, 10)),
    })
  }

  if (target.filePath) {
    items.push(
      divider,
      { label: 'Reveal in Finder', value: 'reveal', handler: actions.revealInFinder },
      { label: 'Copy file path', value: 'copy-path', handler: () => actions.copy(target.filePath!) },
    )
  }

  return items
}

/** Reads the right-click target out of the DOM event. */
export const readEditorContextTarget = (
  event: { target: EventTarget | null },
  options: { selection: string; filePath?: string },
): EditorContextTarget => {
  const element = event.target instanceof Element ? event.target : null
  const anchor = element?.closest('a[href]') as HTMLAnchorElement | null
  const image = element?.closest('img') as HTMLImageElement | null

  return {
    selection: options.selection,
    filePath: options.filePath,
    link: anchor ? { href: anchor.getAttribute('href') || '', text: anchor.textContent || '' } : undefined,
    image: image ? { src: image.getAttribute('src') || '' } : undefined,
    inCodeBlock: Boolean(element?.closest('.cm-editor, pre')),
    inTable: Boolean(element?.closest('td, th')),
  }
}
