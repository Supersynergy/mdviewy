export function isHandoffFile(path = ''): boolean {
  const name = path.split(/[\\/]/).pop() ?? ''
  return /^_?(?:(?:warm[-_ ])?handoff|zwischenrufe)(?:[-_ .]|$)/i.test(name)
}

export type AnswerStatus = 'open' | 'answered'

export function answerStatus(line: string): AnswerStatus | undefined {
  const match = /^\s*(?:>>>\s*)?(?:Userantwort|Antwort)\s*:\s*(.*)$/iu.exec(line)
  if (match) return match[1].trim() ? 'answered' : 'open'
  const field = /^\s*>>>(?!>)\s*(.*)$/.exec(line)
  if (field) return !field[1].trim() || field[1].trimEnd().endsWith('?') ? 'open' : 'answered'
  return undefined
}
