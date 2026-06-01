export interface SearchMatchPosition {
  start: number
  end: number
}

const normalize = (value: string, caseSensitive: boolean) =>
  caseSensitive ? value : value.toLocaleLowerCase()

export function findLiteralMatchPositions(
  text: string,
  query: string,
  caseSensitive: boolean,
): SearchMatchPosition[] {
  if (!query) return []

  const haystack = normalize(text, caseSensitive)
  const needle = normalize(query, caseSensitive)
  const positions: SearchMatchPosition[] = []
  let index = haystack.indexOf(needle)

  while (index !== -1) {
    positions.push({ start: index, end: index + query.length })
    index = haystack.indexOf(needle, index + needle.length)
  }

  return positions
}

export function countLiteralMatches(text: string, query: string, caseSensitive: boolean) {
  return findLiteralMatchPositions(text, query, caseSensitive).length
}
