import type { Ref } from 'vue'

/** How long a panel stays open after the mouse left it: Reka's own close delay while one is open. */
const CLOSE_DELAY_MS = 150

/**
 * The mouse's half of a header menu's panels, for every design: hovering
 * a section's NAME opens its panel as hovering its button does, and the
 * panel stays open while the mouse is on the name, the button or the
 * panel, and closes a moment after it left all three.
 *
 * Each section is its link plus a button that opens its panel
 * (`withDropdownToggles`), and Reka's hover only knows the button: the
 * name, the bigger target and the one the design draws as the entry,
 * opened nothing. Reka's hover is therefore switched off on these menus
 * (`disable-hover-trigger`, `disable-pointer-leave-close`) and this one
 * state, the menu's `v-model`, answers both: two hover machines over one
 * value fought (Reka's pending close shut a panel the name had just
 * opened). Reka keeps the rest: a click or the keyboard on the button,
 * Escape (focus back on the button), a click outside; only Escape on a
 * panel the mouse opened is this one's (`onEscapeKeyDown`).
 *
 * Mouse only: a tap on the name navigates, and a tap on the button is
 * Reka's click. Bind `onPointermove` and `onPointerleave` on an element
 * around the menu, which holds the names, the buttons and the panel's
 * viewport. `pointermove` is also what hydrates the lazy menu, and
 * Vue's replay of it bubbles to this handler like the original.
 */
export function useMenuHover(open: Ref<string | undefined>) {
  let closing: ReturnType<typeof setTimeout> | undefined
  // The panel the mouse opened, until it closes or something else opens one.
  let openedByMouse: string | undefined
  watch(open, (value) => {
    if (value !== openedByMouse) openedByMouse = undefined
  })

  const cancelClose = () => {
    clearTimeout(closing)
    closing = undefined
  }
  const closeSoon = () => {
    if (closing || !open.value) return
    closing = setTimeout(() => {
      closing = undefined
      open.value = ''
    }, CLOSE_DELAY_MS)
  }

  function onPointermove(event: PointerEvent) {
    if (event.pointerType !== 'mouse' || !(event.target instanceof Element)) return
    const section = event.target.closest('[data-menu-section]')?.getAttribute('data-menu-section')
    if (section) {
      cancelClose()
      openedByMouse = section
      open.value = section
    }
    else if (event.target.closest('[data-slot="viewport"]')) {
      cancelClose()
    }
    else {
      closeSoon()
    }
  }

  function onPointerleave(event: PointerEvent) {
    if (event.pointerType === 'mouse') closeSoon()
  }

  /**
   * Escape on a panel the MOUSE opened closes it where the focus is: Reka
   * would move the focus to the panel's button, which the visitor never
   * touched. A panel the keyboard or a click opened keeps Reka's way,
   * focus back on its button. Bound as the menu's `content` handler.
   */
  function onEscapeKeyDown(event: KeyboardEvent) {
    if (!open.value || open.value !== openedByMouse) return
    event.preventDefault()
    cancelClose()
    open.value = ''
  }

  onScopeDispose(cancelClose)

  return { onPointermove, onPointerleave, onEscapeKeyDown }
}
