import { Flex } from 'antd'
import { type FC, useEffect } from 'react'
import type { EditorContext } from 'rme'
import { FindController } from './find-controller'
import { FindInput } from './find-input'
import { ReplaceController } from './replace-controller'
import { ReplaceInput } from './replace-input'
import { useFindReplace } from './use-find-replace'

export interface FindReplaceComponentProps {
  onDismiss?: () => void
  editorCtx: EditorContext
  /** Search term to start from; re-applied whenever the nonce changes. */
  initialQuery?: string
  initialQueryNonce?: number
}

export const FindReplaceComponent: FC<FindReplaceComponentProps> = ({
  onDismiss,
  editorCtx,
  initialQuery,
  initialQueryNonce,
}) => {
  const {
    query,
    setQuery,
    activeIndex,
    total,
    caseSensitive,
    replacement,
    setReplacement,
    toggleCaseSensitive,
    findNext,
    findPrev,
    stopFind,
    replace,
    replaceAll,
  } = useFindReplace(editorCtx)

  useEffect(() => {
    if (initialQuery) setQuery(initialQuery)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery, initialQueryNonce])

  return (
    <Flex gap={8} vertical wrap={false}>
      <Flex gap={4} wrap={false}>
        <FindInput query={query} setQuery={setQuery} total={total} activeIndex={activeIndex} />
        <FindController
          findPrev={findPrev}
          findNext={findNext}
          toggleCaseSensitive={toggleCaseSensitive}
          caseSensitive={caseSensitive}
          stopFind={stopFind}
          onDismiss={onDismiss}
        />
      </Flex>
      <Flex gap={4} wrap={false}>
        <ReplaceInput replacement={replacement} setReplacement={setReplacement} />
        <ReplaceController replace={replace} replaceAll={replaceAll} />
      </Flex>
    </Flex>
  )
}
