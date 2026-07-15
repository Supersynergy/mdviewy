import {
  protectWysiwygEscapedAsterisks,
  restoreWysiwygEscapedAsterisks,
} from '@/helper/wysiwygMarkdownEscapes'
import {
  createWysiwygDelegate,
  type CreateWysiwygDelegateOptions,
  type EditorDelegate,
} from 'rme'

export function createMdviewyWysiwygDelegate(
  options?: CreateWysiwygDelegateOptions,
): EditorDelegate {
  const delegate = createWysiwygDelegate(options)

  return {
    ...delegate,
    stringToDoc: (content) =>
      delegate.stringToDoc(protectWysiwygEscapedAsterisks(content)),
    docToString: (doc) =>
      restoreWysiwygEscapedAsterisks(delegate.docToString(doc)),
  }
}
