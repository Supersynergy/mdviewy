import { describe, expect, it, vi } from 'vitest'
import {
  buildEditorContextMenu,
  readEditorContextTarget,
  type EditorContextActions,
  type EditorContextTarget,
} from './editorContextMenu'

const ALL_COMMANDS = new Set([
  'insertText',
  'toggleStrong',
  'toggleEmphasis',
  'toggleCodeText',
  'toggleDelete',
  'toggleHeading',
  'toggleList',
  'toggleBlockquote',
  'createCodeMirror',
  'createTable',
  'insertHorizontalRule',
  'addTableRowBefore',
  'addTableRowAfter',
  'addTableColumnBefore',
  'addTableColumnAfter',
  'deleteTableRow',
  'deleteTableColumn',
  'deleteTable',
])

const actions = (overrides: Partial<EditorContextActions> = {}): EditorContextActions => ({
  available: (command) => ALL_COMMANDS.has(command),
  run: vi.fn(),
  copy: vi.fn(),
  cut: vi.fn(),
  paste: vi.fn(),
  pastePlainText: vi.fn(),
  findInDocument: vi.fn(),
  openLink: vi.fn(),
  revealInFinder: vi.fn(),
  copyAiPrompt: vi.fn(),
  speechEngines: [
    { id: 'system', label: 'System voice', detail: 'macOS say, offline' },
    { id: 'jarvis_de', label: 'Jarvis · German', detail: 'Piper / Thorsten' },
  ],
  speak: vi.fn(),
  stopSpeaking: vi.fn(),
  revealPath: vi.fn(),
  openPath: vi.fn(),
  openPathInTerminal: vi.fn(),
  openInApp: vi.fn().mockResolvedValue(true),
  askAgent: vi.fn(),
  replaceSelection: vi.fn(),
  insertText: vi.fn(),
  ...overrides,
})

const target = (overrides: Partial<EditorContextTarget> = {}): EditorContextTarget => ({
  selection: '',
  inCodeBlock: false,
  inTable: false,
  ...overrides,
})

const labels = (items: ReturnType<typeof buildEditorContextMenu>): string[] =>
  items.flatMap((item) =>
    'label' in item ? [item.label, ...(item.children ? labels(item.children) : [])] : [],
  )

describe('buildEditorContextMenu', () => {
  it('offers formatting and block conversion for a selection', () => {
    const items = buildEditorContextMenu(target({ selection: 'lever' }), actions())
    const found = labels(items)

    expect(found).toEqual(expect.arrayContaining(['Cut', 'Copy', 'Bold', 'Italic', 'Heading 1', 'Quote']))
  })

  it('drops copy and formatting when nothing is selected, and offers insertion instead', () => {
    const found = labels(buildEditorContextMenu(target(), actions()))

    expect(found).not.toContain('Cut')
    expect(found).not.toContain('Bold')
    expect(found).toEqual(expect.arrayContaining(['Paste', 'Paste as plain text', 'Table', 'Divider']))
  })

  it('never lists a command the editor does not have', () => {
    const found = labels(
      buildEditorContextMenu(target({ selection: 'x' }), actions({ available: () => false })),
    )

    expect(found).not.toContain('Bold')
    expect(found).not.toContain('Heading 1')
    // Clipboard actions do not depend on editor commands.
    expect(found).toContain('Paste')
  })

  it('puts link actions first when the pointer is on a link', () => {
    const items = buildEditorContextMenu(
      target({ link: { href: 'https://example.com', text: 'Example' } }),
      actions(),
    )

    expect('label' in items[0] && items[0].label).toContain('Open https://example.com')
    expect(labels(items)).toEqual(expect.arrayContaining(['Copy link address', 'Copy link text']))
  })

  it('offers app-open and Finder reveal for a resolvable local link', () => {
    const openInApp = vi.fn().mockResolvedValue(true)
    const revealPath = vi.fn()
    const items = buildEditorContextMenu(
      target({ link: { href: './a.md', text: 'A', resolvedPath: '/docs/a.md' } }),
      actions({ openInApp, revealPath }),
    )
    const found = labels(items)

    expect('label' in items[0] && items[0].label).toBe('Open /docs/a.md')
    expect(found).toEqual(
      expect.arrayContaining(['Reveal in Finder', 'Open with default app', 'Copy path']),
    )

    if ('handler' in items[0]) items[0].handler?.()
    expect(openInApp).toHaveBeenCalledWith('/docs/a.md')
  })

  it('falls back to the system app when the path is not displayable', async () => {
    const openInApp = vi.fn().mockResolvedValue(false)
    const openPath = vi.fn()
    const items = buildEditorContextMenu(
      target({ link: { href: './a.xyz', text: 'A', resolvedPath: '/docs/a.xyz' } }),
      actions({ openInApp, openPath }),
    )

    if ('handler' in items[0]) items[0].handler?.()
    await vi.waitFor(() => expect(openPath).toHaveBeenCalledWith('/docs/a.xyz'))
  })

  it('offers row and column editing inside a table', () => {
    const found = labels(buildEditorContextMenu(target({ inTable: true }), actions()))

    expect(found).toEqual(
      expect.arrayContaining(['Row above', 'Row below', 'Column left', 'Delete row', 'Delete table']),
    )
  })

  it('searches the selected text', () => {
    const findInDocument = vi.fn()
    const items = buildEditorContextMenu(
      target({ selection: 'Distribution first' }),
      actions({ findInDocument }),
    )
    const find = items.find((item) => 'value' in item && item.value === 'find-selection')

    expect(find && 'label' in find && find.label).toContain('Distribution first')
    if (find && 'handler' in find) find.handler?.()
    expect(findInDocument).toHaveBeenCalledWith('Distribution first')
  })

  it('offers file actions only when the document has a path', () => {
    expect(labels(buildEditorContextMenu(target(), actions()))).not.toContain('Reveal in Finder')
    expect(labels(buildEditorContextMenu(target({ filePath: '/docs/a.md' }), actions()))).toContain(
      'Reveal in Finder',
    )
  })

  it('offers every installed voice plus a stop entry', () => {
    const speak = vi.fn()
    const items = buildEditorContextMenu(target({ selection: 'Vorlesen' }), actions({ speak }))
    const speech = items.find((item) => 'value' in item && item.value === 'speak')

    expect(speech && 'children' in speech && labels(speech.children ?? [])).toEqual([
      'System voice — macOS say, offline',
      'Jarvis · German — Piper / Thorsten',
      'Stop speaking',
    ])
  })

  it('hides the speech group when no voice is installed', () => {
    const found = labels(
      buildEditorContextMenu(target({ selection: 'x' }), actions({ speechEngines: [] })),
    )

    expect(found).not.toContain('Speak selection')
  })

  it('reads the whole document aloud when nothing is selected', () => {
    const speak = vi.fn()
    const items = buildEditorContextMenu(
      target({ documentText: 'Ganzer Text des Dokuments.' }),
      actions({ speak }),
    )
    const speech = items.find((item) => 'value' in item && item.value === 'speak-document')

    expect(speech && 'children' in speech && labels(speech.children ?? [])).toEqual([
      'System voice — macOS say, offline',
      'Jarvis · German — Piper / Thorsten',
      'Stop speaking',
    ])

    const speakSystem = speech && 'children' in speech ? speech.children?.[0] : undefined
    if (speakSystem && 'handler' in speakSystem) speakSystem.handler?.()
    expect(speak).toHaveBeenCalledWith('system', 'Ganzer Text des Dokuments.')
  })

  it('offers no document reading without document text', () => {
    expect(labels(buildEditorContextMenu(target(), actions()))).not.toContain('Speak document')
  })

  it('acts on paths found in the selection', () => {
    const revealPath = vi.fn()
    const items = buildEditorContextMenu(
      target({ selection: 'see /repo/docs/SPEC.md', paths: [{ label: 'SPEC.md', path: '/repo/docs/SPEC.md' }] }),
      actions({ revealPath }),
    )
    const entry = items.find((item) => 'value' in item && item.value === 'path-/repo/docs/SPEC.md')

    expect(entry && 'label' in entry && entry.label).toBe('SPEC.md')
    const reveal = entry && 'children' in entry ? entry.children?.[0] : undefined
    if (reveal && 'handler' in reveal) reveal.handler?.()
    expect(revealPath).toHaveBeenCalledWith('/repo/docs/SPEC.md')
  })

  it('offers line tools only for a multi-line selection', () => {
    const single = labels(buildEditorContextMenu(target({ selection: 'one line' }), actions()))
    const multi = labels(buildEditorContextMenu(target({ selection: 'b\na\nb' }), actions()))

    expect(single).not.toContain('Sort A → Z')
    expect(multi).toEqual(expect.arrayContaining(['Sort A → Z', 'Remove duplicates', 'Reverse']))
  })

  it('sorts and dedupes the selected lines', () => {
    const replaceSelection = vi.fn()
    const items = buildEditorContextMenu(
      target({ selection: 'b\na\nb' }),
      actions({ replaceSelection }),
    )
    const lines = items.find((item) => 'value' in item && item.value === 'lines')
    const children = lines && 'children' in lines ? lines.children ?? [] : []

    const sort = children.find((item) => 'value' in item && item.value === 'lines-sort')
    if (sort && 'handler' in sort) sort.handler?.()
    expect(replaceSelection).toHaveBeenCalledWith('a\nb\nb')

    const dedupe = children.find((item) => 'value' in item && item.value === 'lines-dedupe')
    if (dedupe && 'handler' in dedupe) dedupe.handler?.()
    expect(replaceSelection).toHaveBeenCalledWith('b\na')
  })

  it('hands a selection to an agent', () => {
    const askAgent = vi.fn()
    const items = buildEditorContextMenu(target({ selection: 'why?' }), actions({ askAgent }))
    const group = items.find((item) => 'value' in item && item.value === 'ask-agent')
    const claude = group && 'children' in group ? group.children?.[0] : undefined

    if (claude && 'handler' in claude) claude.handler?.()
    expect(askAgent).toHaveBeenCalledWith('claude', 'why?')
  })

  it('leaves out the WebView default noise', () => {
    const found = labels(buildEditorContextMenu(target({ selection: 'x' }), actions()))

    for (const noise of ['Speech', 'Substitutions', 'Transformations', 'Font', 'Services', 'AutoFill']) {
      expect(found).not.toContain(noise)
    }
  })
})

describe('readEditorContextTarget', () => {
  it('detects links, images, code blocks, and table cells', () => {
    document.body.innerHTML = `
      <table><tr><td id="cell">value <a id="link" href="/notes.md">Notes</a></td></tr></table>
      <pre class="cm-editor"><span id="code">const a = 1</span></pre>
      <p><img id="pic" src="/img/a.png" /></p>
    `

    const link = readEditorContextTarget({ target: document.getElementById('link') }, { selection: '' })
    expect(link.link?.href).toBe('/notes.md')
    expect(link.inTable).toBe(true)

    const code = readEditorContextTarget({ target: document.getElementById('code') }, { selection: '' })
    expect(code.inCodeBlock).toBe(true)

    const image = readEditorContextTarget({ target: document.getElementById('pic') }, { selection: '' })
    expect(image.image?.src).toBe('/img/a.png')
  })
})
