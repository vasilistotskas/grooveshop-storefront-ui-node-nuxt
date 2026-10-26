import { expect, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { DOMWrapper } from '@vue/test-utils'

/**
 * Pick an item from a table row's action menu (a `UDropdownMenu`: its
 * content is a popover teleported into the body). Opens the row's trigger
 * from the keyboard, waits for the menu, and clicks the item by its text.
 * The row's tooltip needs the provider the app shell supplies, so a spec
 * that mounts such a table stubs `UTooltip` (`TOOLTIP_STUB`).
 */
export async function pickFromRowMenu(row: DOMWrapper<Element>, label: string) {
  await row.get('button[aria-haspopup="menu"]').trigger('keydown', { key: 'Enter' })
  await flushPromises()
  let item: Element | undefined
  await vi.waitFor(() => {
    item = [...document.body.querySelectorAll('[role="menuitem"]')].find(candidate => candidate.textContent?.trim() === label)
    expect(item).toBeDefined()
  })
  item!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await flushPromises()
}

/** `global.stubs` entry for a component that wraps its content in a `UTooltip`. */
export const TOOLTIP_STUB = { UTooltip: { template: '<div><slot /></div>' } }
