import React, { ReactElement, useCallback, useRef, useState } from 'react'
import styled from 'styled-components'
import mergeRefs from './merge-refs'

type Props = {
  children: (dimens: { width: number; height: number }) => ReactElement
}

const style = {
  flex: 1,
  width: '100%',
  height: '100%',
  minHeight: 0,
  minWidth: 0,
}

const Container = styled.div`
  ::-webkit-scrollbar {
    display: none;
  }

  .indentLines {
    --indent-size: 16px;

    position: absolute;
    top: 0;
    left: 4px;
    z-index: -1;
    display: flex;
    align-items: flex-start;
    height: 100%;
  }

  .indentLines > div {
    height: 100%;
    padding-left: 10px;
    border-right: 1px solid ${props => props.theme.fileTreeIndentLineColor};
    margin-right: calc(var(--indent-size) - 10px - 1px);
    z-index: 1;
  }
`

function useElementSize() {
  const [size, setSize] = useState({ width: 0, height: 0 })
  const observerRef = useRef<ResizeObserver | null>(null)

  const ref = useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect()

    if (!node) {
      observerRef.current = null
      setSize({ width: 0, height: 0 })
      return
    }

    const nextObserver = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width, height })
    })
    nextObserver.observe(node)
    observerRef.current = nextObserver
  }, [])

  return { ref, ...size }
}

export const FillFlexParent = React.forwardRef(function FillFlexParent(props: Props, forwardRef) {
  const { ref, width, height } = useElementSize()
  return (
    <Container style={style} ref={mergeRefs(ref, forwardRef)}>
      {width && height ? props.children({ width, height }) : null}
    </Container>
  )
})
