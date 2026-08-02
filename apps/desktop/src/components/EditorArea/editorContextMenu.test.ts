import { describe, expect, it, vi } from 'vitest'
import {
  buildEditorContextMenu,
  readEditorContextTarget,
  type EditorContextActions,
  type EditorContextTarget,
} from './editorContextMenu'

const ALL_COMMANDS = new Set([
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
