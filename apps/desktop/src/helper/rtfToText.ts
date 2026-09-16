/**
 * Minimal RTF → plain-text converter.
 *
 * Implements the standard control-word/destination walk from the RTF spec:
 * groups push/pop parser state, `\'hh` hex escapes decode bytes, `\uN` emits a
 * Unicode code point and skips `uc` fallback chars, formatting destinations
 * (font table, color table, style sheet, pictures, objects, `\*` groups) are
 * dropped. Output is readable text, not layout — good enough for previewing
 * and agent handoff without pulling in a full RTF engine.
 */

interface RtfGroupState {
  ucskip: number
  ignorable: boolean
}

// Control-word destinations whose whole group content is dropped.
const SKIP_DESTINATIONS = new Set([
  'fonttbl',
  'colortbl',
  'stylesheet',
  'info',
  'pict',
  'object',
  'generator',
  'datafield',
  'xmlnstbl',
  'listtable',
  'listoverridetable',
  'rsidtbl',
  'mmathPr',
  'themedata',
  'colorschememapping',
  'filetbl',
  'keycode',
  'shppict',
  'nonshppict',
])

// Control words that emit literal text.
const SYMBOL_CHARS: Record<string, string> = {
  par: '\n',
  line: '\n',
  page: '\n\n',
  column: '\n',
  tab: '\t',
  emdash: '—',
  endash: '–',
  emspace: ' ',
  enspace: ' ',
  qmspace: ' ',
  bullet: '•',
  lquote: '‘',
  rquote: '’',
  ldblquote: '“',
  rdblquote: '”',
  '~': ' ',
  '-': '',
  _: '‑',
  '*': '',
}

export function rtfToText(rtf: string): string {
  const out: string[] = []
  const stack: RtfGroupState[] = []
  let ucskip = 1
  let curskip = 0
  let ignorable = false
  let i = 0
  const n = rtf.length

  const push = () => {
    stack.push({ ucskip, ignorable })
  }
  const pop = () => {
    const s = stack.pop()
    if (s) {
      ucskip = s.ucskip
      ignorable = s.ignorable
    }
  }

  while (i < n) {
    const c = rtf[i]

    if (c === '{') {
      push()
      i++
      continue
    }
    if (c === '}') {
      pop()
      i++
      continue
    }
    if (c === '\r' || c === '\n') {
      i++
      continue
    }

    if (c === '\\') {
      i++
      if (i >= n) break
      const nc = rtf[i]

      // Escaped literal or hex escape.
      if (nc === '\\' || nc === '{' || nc === '}') {
        if (!ignorable && curskip === 0) out.push(nc)
        i++
        continue
      }
      if (nc === "'") {
        const hex = rtf.slice(i + 1, i + 3)
        const byte = parseInt(hex, 16)
        if (!ignorable && curskip === 0 && !Number.isNaN(byte)) {
          out.push(String.fromCharCode(byte))
        }
        i += 3
        continue
      }
      if (nc === '|' || nc === '-' || nc === '_' || nc === '~' || nc === '*') {
        if (nc === '*') {
          ignorable = true
        } else if (!ignorable && curskip === 0) {
          out.push(SYMBOL_CHARS[nc] ?? nc)
        }
        i++
        continue
      }

      // Control word: letters then optional signed number then one space delimiter.
      const wordMatch = /^[a-zA-Z]+/.exec(rtf.slice(i))
      if (!wordMatch) {
        i++
        continue
      }
      const word = wordMatch[0]
      i += word.length
      let param: number | undefined
      const numMatch = /^-?\d+/.exec(rtf.slice(i))
      if (numMatch) {
        param = parseInt(numMatch[0], 10)
        i += numMatch[0].length
      }
      if (rtf[i] === ' ') i++

      if (SKIP_DESTINATIONS.has(word) || word === '*') {
        ignorable = true
        continue
      }
      if (word === 'uc' && param !== undefined) {
        ucskip = param
        continue
      }
      if (word === 'u' && param !== undefined) {
        if (!ignorable && curskip === 0) {
          const code = param < 0 ? param + 65536 : param
          out.push(String.fromCodePoint(code))
        }
        curskip = ucskip
        continue
      }

      if (curskip > 0) {
        curskip--
        continue
      }
      if (ignorable) continue

      const sym = SYMBOL_CHARS[word]
      if (sym !== undefined) {
        out.push(sym)
      }
      continue
    }

    // Plain character.
    if (curskip > 0) {
      curskip--
    } else if (!ignorable) {
      out.push(c)
    }
    i++
  }

  // Collapse the blank-line noise RTF producers emit around paragraph marks.
  return out
    .join('')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
