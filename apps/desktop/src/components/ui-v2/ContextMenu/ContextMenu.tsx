import type { IShowContextMenuParams } from '@/stores/useContextMenuStore'
import useContextMenuStore from '@/stores/useContextMenuStore'
import { memo, useEffect } from 'react'
import { Menu, useMenuStore } from 'zens'

export const showContextMenu = (params: IShowContextMenuParams) => {
  const { show } = useContextMenuStore.getState()
  show(params)
}

export const hideContextMenu = () => {
  useContextMenuStore.getState().hide()
}

/** How long after a close a click on the trigger still counts as that close. */
const DISMISS_GRACE_MS = 250

/**
 * Opens the menu, or leaves it closed when the same click just dismissed it.
 *
 * A press outside the menu closes it before the trigger's click handler runs,
 * so a plain `showContextMenu` reopens the menu the user meant to close and the
 * button never appears to toggle.
 */
export const toggleContextMenu = (params: IShowContextMenuParams) => {
  const { open, lastHiddenAt, show, hide } = useContextMenuStore.getState()

  if (open) {
    hide()
    return
  }

  if (Date.now() - lastHiddenAt < DISMISS_GRACE_MS) return

  show(params)
}

export const ContextMenu = memo(() => {
  const { x, y, items, show, open } = useContextMenuStore()
  const menu = useMenuStore()

  useEffect(() => {
    if (open) {
      menu.show()
    }
  }, [x, y, items, open, menu, show])

  const anchorRect = { x, y }

  return <Menu style={{ zIndex: 11 }} store={menu} items={items} getAnchorRect={() => anchorRect} onClose={hideContextMenu}></Menu>
})
