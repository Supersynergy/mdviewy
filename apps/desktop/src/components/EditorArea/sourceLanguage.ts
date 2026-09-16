import { LanguageDescription, LanguageSupport } from '@codemirror/language'
import { languages } from '@codemirror/language-data'
import isPromise from 'is-promise'
import type { MfCodemirrorView } from 'rme'

/**
 * Applies real CodeMirror language support to an rme source-editor view.
 *
 * rme resolves the `language` doc attr through `LanguageDescription.alias`
 * only, which covers ~25 of the ~100 bundled grammars (and not 'markdown',
 * 'json' or 'python'). We instead match on filename — the same matcher Sublime-
 * style tools use — and reconfigure rme's `languageConf` compartment, so a
 * `foo.py` opened via `open -a` gets Python highlighting instead of falling
 * back to the bundled Markdown grammar.
 */
export function applySourceLanguage(cmView: MfCodemirrorView, fileName: string | undefined) {
  if (!fileName) return
  const desc = LanguageDescription.matchFilename(languages, fileName)
  if (!desc) return

  const conf = (cmView as unknown as { languageConf?: { reconfigure: (s: LanguageSupport) => unknown } })
    .languageConf
  if (!conf) return

  const install = (support: LanguageSupport) => {
    cmView.cm.dispatch({ effects: conf.reconfigure(support) as any })
  }

  try {
    const loaded = desc.support ?? desc.load()
    if (isPromise(loaded)) {
      loaded.then(install).catch(() => {})
    } else if (loaded) {
      install(loaded)
    }
  } catch {
    // Highlighting is best-effort; the source text itself is already usable.
  }
}
