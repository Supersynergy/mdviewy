import { documentFiles } from './documentFiles'

interface Doc {
  slug: string
  title: string
  locale: string
  key: string
}

export const docs: Doc[] = documentFiles.keys().sort().map((key: string) => {
  const [, locale, ...parts] = key.slice(0, -3).split('/')
  return { key, locale, slug: '/' + parts.join('/'), title: parts[parts.length - 1] }
})

export function readDocument(doc: Doc): string {
  const source = documentFiles(doc.key)
  const text: string = typeof source === 'string' ? source : source.default
  return text.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '')
}

export function getSections(locale?: string) {
  const sections: Record<string, Doc[]> = {}
  for (const doc of docs) {
    if (locale && doc.locale !== locale) continue
    const section = doc.slug.split('/')[1] || doc.locale
    const items = sections[section] ??= []
    items.push(doc)
  }
  return sections
}
