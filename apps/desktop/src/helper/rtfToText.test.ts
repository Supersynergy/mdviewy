import { describe, expect, it } from 'vitest'
import { rtfToText } from './rtfToText'

describe('rtfToText', () => {
  it('extracts plain text from a minimal document', () => {
    const rtf = '{\\rtf1\\ansi{\\fonttbl{\\f0 Arial;}}\\f0\\fs24 Hello World\\par Next line}'
    expect(rtfToText(rtf)).toBe('Hello World\nNext line')
  })

  it('drops metadata destinations entirely', () => {
    const rtf = '{\\rtf1{\\info{\\title Secret Title}{\\author A}}{\\colortbl;\\red255\\green0\\blue0;}Visible}'
    expect(rtfToText(rtf)).toBe('Visible')
  })

  it('decodes hex escapes and unicode control words', () => {
    expect(rtfToText("{\\rtf1 Caf\\'e9 \\u8364\\u106?}")).toBe('Café €')
  })

  it('handles \\u fallback skipping per \\uc setting', () => {
    // \uc0 → no fallback chars consumed after \u
    expect(rtfToText('{\\rtf1\\uc0 \\u169x}').trim()).toBe('©x')
  })

  it('consumes an escaped fallback without losing the next letter', () => {
    expect(rtfToText(String.raw`{\rtf1\u228\'e4pfel}`)).toBe('äpfel')
    expect(rtfToText(String.raw`{\rtf1\u123\{ok}`)).toBe('{ok')
  })

  it('preserves escaped line breaks from macOS text documents', () => {
    expect(rtfToText('{\\rtf1 one\\\ntwo\\\r\nthree}')).toBe('one\ntwo\nthree')
  })

  it('reads Windows ANSI smart quotes and euros', () => {
    expect(rtfToText(String.raw`{\rtf1\ansi\ansicpg1252 \'93Preis: 5 \'80\'94}`)).toBe('“Preis: 5 €”')
  })

  it('recovers from an out-of-range Unicode parameter', () => {
    expect(rtfToText(String.raw`{\rtf1\u99999999? ok}`)).toBe('� ok')
  })

  it('converts paragraph and tab control words', () => {
    const rtf = '{\\rtf1 one\\tab two\\par three}'
    expect(rtfToText(rtf)).toBe('one\ttwo\nthree')
  })

  it('maps typographic control words', () => {
    const rtf = '{\\rtf1 a\\endash b\\emdash c\\bullet d\\lquote q\\rquote}'
    expect(rtfToText(rtf)).toBe('a–b—c•d‘q’')
  })

  it('treats \\*-marked groups as ignorable destinations', () => {
    const rtf = '{\\rtf1 keep{\\*\\fonttbl dropped} shown}'
    expect(rtfToText(rtf)).toBe('keep shown')
  })

  it('survives malformed input without throwing', () => {
    expect(() => rtfToText('{\\rtf1 unclosed \\par')).not.toThrow()
    expect(() => rtfToText('not even rtf')).not.toThrow()
    expect(rtfToText('plain text')).toBe('plain text')
  })
})
