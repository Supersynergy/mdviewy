import { StateEffect, StateField, type Text } from '@codemirror/state'
import { Decoration, EditorView, keymap, showPanel } from '@codemirror/view'
import { answerStatus, isHandoffFile } from '@/helper/handoff'
import type { MfCodemirrorView } from 'rme'

function indexAnswers(doc: Text) {
  const marks = []
  const open: number[] = []
  let fields = 0
  let fence = ''
  for (let n = 1; n <= doc.lines; n++) {
    const line = doc.line(n)
    const delimiter = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line.text)
    if (delimiter) {
      if (!fence && !(delimiter[1][0] === '`' && delimiter[2].includes('`'))) fence = delimiter[1]
      else if (fence && delimiter[1].startsWith(fence) && !delimiter[2].trim()) fence = ''
      continue
    }
    if (fence || /^(?: {4}| {0,3}\t)/.test(line.text)) continue
    const status = answerStatus(line.text)
    if (!status) {
      const alert = /^\s*>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i.exec(line.text)
      if (alert) marks.push(Decoration.line({ class: 'handoff-' + alert[1].toLowerCase() }).range(line.from))
      continue
    }
    fields++
    if (status === 'open') open.push(line.to)
    marks.push(Decoration.line({ class: 'handoff-' + status }).range(line.from))
  }
  return { marks: Decoration.set(marks), open, fields }
}

const answers = StateField.define({
  create: state => indexAnswers(state.doc),
  update: (value, transaction) => transaction.docChanged ? indexAnswers(transaction.newDoc) : value,
  provide: field => EditorView.decorations.from(field, value => value.marks),
})

function nextAnswer(view: EditorView) {
  const { open } = view.state.field(answers)
  if (!open.length) return false
  const anchor = open.find(position => position > view.state.selection.main.head) ?? open[0]
  view.dispatch({ selection: { anchor }, scrollIntoView: true })
  view.focus()
  return true
}

export const handoffEditing = [
  answers,
  keymap.of([{ key: 'Alt-Shift-n', run: nextAnswer }]),
  showPanel.of(view => {
    const dom = document.createElement('div')
    dom.className = 'handoff-panel'
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = 'Nächste offene Antwort'
    button.title = 'Zur nächsten offenen Antwort springen (Alt + Umschalt + N)'
    button.addEventListener('click', () => nextAnswer(view))
    const count = document.createElement('span')
    count.setAttribute('role', 'status')
    dom.append(count, button)
    const refresh = () => {
      const { open, fields } = view.state.field(answers)
      dom.hidden = fields === 0
      button.disabled = !open.length
      count.textContent = open.length + ' von ' + fields + ' offen'
    }
    refresh()
    return { dom, top: true, update(update) { if (update.docChanged) refresh() } }
  }),
  EditorView.baseTheme({
    '.handoff-note': { borderLeft: '3px solid #4184cf', backgroundColor: 'rgba(65,132,207,.12)' },
    '.handoff-important': { borderLeft: '3px solid #a16ac9', backgroundColor: 'rgba(161,106,201,.14)' },
    '.handoff-caution': { borderLeft: '3px solid #d55358', backgroundColor: 'rgba(213,83,88,.14)' },
    '.handoff-open, .handoff-warning': { borderLeft: '3px solid #c58a16', backgroundColor: 'rgba(215,158,33,.16)' },
    '.handoff-answered, .handoff-tip': { borderLeft: '3px solid #369a77', backgroundColor: 'rgba(48,157,117,.12)' },
    '.handoff-panel:not([hidden])': { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.8em', padding: '4px 12px' },
    '.handoff-panel button': { color: 'inherit', font: 'inherit', cursor: 'pointer' },
    '.handoff-panel button:disabled': { opacity: '0.55', cursor: 'default' },
  }),
]

export function installHandoffEditing(view: MfCodemirrorView, fileName: string) {
  if (isHandoffFile(fileName) && /\.(?:md|markdown|txt)$/i.test(fileName)) {
    view.cm.dispatch({ effects: StateEffect.appendConfig.of(handoffEditing) })
  }
}
