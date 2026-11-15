import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { describe, expect, it } from 'vitest'
import { isHandoffFile, answerStatus } from '@/helper/handoff'
import { handoffEditing } from './handoffEditing'

describe('Warm Handoff', () => {
  it('limits automatic styling to named handoff and interjection documents', () => {
    expect(isHandoffFile('/work/_handoff-mdviewy-2026.md')).toBe(true)
    expect(isHandoffFile('C:\\work\\Zwischenrufe.rtf')).toBe(true)
    expect(isHandoffFile('/handoff/notizen.md')).toBe(false)
    expect(isHandoffFile('handoffish.md')).toBe(false)
    expect(answerStatus('>>>Userantwort: behalten')).toBe('answered')
    expect(answerStatus('>>>Hast du dazu noch was anzumerken?')).toBe('open')
    expect(answerStatus('Userantwort:')).toBe('open')
    expect(answerStatus('Userantwort: Ja')).toBe('answered')
    expect(answerStatus('>>>> Zitat')).toBeUndefined()
  })

  it('jumps over examples, updates answers, wraps and preserves the source on reopen', () => {
    const text = ['> [!IMPORTANT] Entscheidung', '```md', '>>>Userantwort:', '```', '>>>Userantwort:', '```Beispiel```', '>>>Antwort:', 'Ende', '    >>>Userantwort:', '\t>>>Antwort:'].join('\n')
    const make = (doc: string) => new EditorView({ state: EditorState.create({ doc, extensions: handoffEditing }), parent: document.body })
    let view = make(text)
    try {
      const button = () => view.dom.querySelector<HTMLButtonElement>('.handoff-panel button')!
      expect(view.dom.textContent).toContain('2 von 2 offen')
      expect(view.dom.querySelector('.handoff-important')).toBeTruthy()
      button().click()
      expect(view.state.selection.main.head).toBe(view.state.doc.line(5).to)
      view.dispatch(view.state.replaceSelection(' Ja'))
      expect(view.dom.textContent).toContain('1 von 2 offen')
      button().click()
      expect(view.state.selection.main.head).toBe(view.state.doc.line(7).to)
      view.dispatch({ selection: { anchor: view.state.doc.length } })
      button().click()
      expect(view.state.selection.main.head).toBe(view.state.doc.line(7).to)
      view.dispatch(view.state.replaceSelection(' Nein'))
      expect(button().disabled).toBe(true)
      const saved = view.state.doc.toString()
      expect(saved).toBe(text.replace('>>>Userantwort:\n```Beispiel', '>>>Userantwort: Ja\n```Beispiel').replace('>>>Antwort:\nEnde', '>>>Antwort: Nein\nEnde'))
      view.destroy()
      view = make(saved)
      expect(view.dom.textContent).toContain('0 von 2 offen')
    } finally { view.destroy() }
  })
})
