import { createPortal } from 'react-dom'
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import styled from 'styled-components'

type PopoverPlacement = 'bottomRight' | 'bottomLeft' | 'topRight' | 'topLeft'
type PopoverTrigger = 'hover' | 'click'

type PopoverProps = {
  children: ReactNode
  content: ReactNode
  contentClassName?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  placement?: PopoverPlacement
  trigger?: PopoverTrigger
}

const Trigger = styled.span`
  display: inline-flex;
`

const Content = styled.div`
  min-width: max-content;
  max-width: min(420px, calc(100vw - 24px));
  padding: 8px;
  border: 1px solid ${(props) => props.theme.borderColor};
  border-radius: 10px;
  background: ${(props) => props.theme.bgColor};
  color: ${(props) => props.theme.primaryFontColor};
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0, 0, 0, 0.08);
  backdrop-filter: saturate(180%) blur(20px);
`

const GAP = 6

const getContentStyle = (
  anchor: DOMRect,
  placement: PopoverPlacement,
): CSSProperties => {
  const alignRight = placement.endsWith('Right')
  const alignTop = placement.startsWith('top')
  const style: CSSProperties = {
    position: 'fixed',
    top: alignTop ? anchor.top - GAP : anchor.bottom + GAP,
    zIndex: 1000,
  }

  if (alignRight) {
    style.right = window.innerWidth - anchor.right
  } else {
    style.left = anchor.left
  }

  if (alignTop) {
    style.transform = 'translateY(-100%)'
  }

  return style
}

export default function Popover({
  children,
  content,
  contentClassName,
  open,
  onOpenChange,
  placement = 'bottomRight',
  trigger = 'hover',
}: PopoverProps) {
  const triggerRef = useRef<HTMLSpanElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [innerOpen, setInnerOpen] = useState(false)
  const [contentStyle, setContentStyle] = useState<CSSProperties | null>(null)
  const actualOpen = open ?? innerOpen

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (open === undefined) {
        setInnerOpen(nextOpen)
      }
      onOpenChange?.(nextOpen)
    },
    [onOpenChange, open],
  )

  const clearCloseTimer = useCallback(() => {
    if (!closeTimerRef.current) return
    clearTimeout(closeTimerRef.current)
    closeTimerRef.current = null
  }, [])

  const scheduleClose = useCallback(() => {
    clearCloseTimer()
    closeTimerRef.current = setTimeout(() => setOpen(false), 120)
  }, [clearCloseTimer, setOpen])

  const updatePosition = useCallback(() => {
    const anchor = triggerRef.current?.getBoundingClientRect()
    if (!anchor) return
    setContentStyle(getContentStyle(anchor, placement))
  }, [placement])

  useEffect(() => {
    if (!actualOpen) return

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [actualOpen, updatePosition])

  useEffect(() => {
    if (!actualOpen || trigger !== 'click') return

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (triggerRef.current?.contains(target)) return
      if (contentRef.current?.contains(target)) return
      setOpen(false)
    }

    window.addEventListener('pointerdown', closeOnOutsidePointer, true)
    return () => window.removeEventListener('pointerdown', closeOnOutsidePointer, true)
  }, [actualOpen, setOpen, trigger])

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer])

  const handleTriggerClick = () => {
    if (trigger !== 'click') return
    setOpen(!actualOpen)
  }

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (trigger !== 'click') return
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    setOpen(!actualOpen)
  }

  const hoverHandlers =
    trigger === 'hover'
      ? {
          onMouseEnter: () => {
            clearCloseTimer()
            setOpen(true)
          },
          onMouseLeave: scheduleClose,
          onFocus: () => setOpen(true),
          onBlur: scheduleClose,
        }
      : {}

  return (
    <>
      <Trigger
        ref={triggerRef}
        tabIndex={trigger === 'click' ? 0 : undefined}
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
        {...hoverHandlers}
      >
        {children}
      </Trigger>
      {actualOpen && contentStyle
        ? createPortal(
            <Content
              ref={contentRef}
              className={contentClassName}
              role='dialog'
              style={contentStyle}
              onMouseEnter={trigger === 'hover' ? clearCloseTimer : undefined}
              onMouseLeave={trigger === 'hover' ? scheduleClose : undefined}
            >
              {content}
            </Content>,
            document.body,
          )
        : null}
    </>
  )
}
