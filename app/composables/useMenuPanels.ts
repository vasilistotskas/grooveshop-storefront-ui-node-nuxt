import type { Ref } from 'vue'

/** How long a panel stays open after the mouse left it: Reka's own close delay while one is open. */
const CLOSE_DELAY_MS = 150

/**
 * A tap's own `click` arrives within this of its `pointerup`; a click
 * later than that is a new activation.
 */
const TAP_CLICK_WINDOW_MS = 800

/**
 * How long after the mouse opened a panel a click on its button leaves it
 * open: Reka's trigger, `hasPointerMoveOpenedRef = refAutoReset(false, 300)`
 * (reka-ui 2.11, `NavigationMenuTrigger`).
 */
const HOVER_OPEN_CLICK_GUARD_MS = 300

/**
 * Who opens and closes a header menu's panels, for every design: one state,
 * the menu's `v-model`, driven by handlers on an element AROUND the menu.
 *
 * Each section is its link plus a button that opens its panel
 * (`withDropdownToggles`, which marks both `data-menu-section` and the
 * button `data-menu-toggle`).
 *
 * - The mouse: hovering the name or the button opens the section's panel;
 *   the panel stays open while the mouse is on the name, the button or the
 *   panel, and closes a moment after it left all three. Reka's hover only
 *   knew the button, and two hover machines over one value fought (Reka's
 *   pending close shut a panel the name had just opened), so Reka's hover is
 *   off on these menus (`disable-hover-trigger`,
 *   `disable-pointer-leave-close`). Its trigger's two guards come with
 *   it, the section (name and button) standing for the trigger: a click on
 *   the button within 300ms of the mouse opening the panel leaves it open
 *   (`hasPointerMoveOpenedRef`), and a panel a click or Escape closed is
 *   not reopened by the mouse until it has left the section and come back
 *   (`wasClickCloseRef`, `wasEscapeCloseRef`). Without them a click on
 *   the arrow closed the panel and the next pixel of movement reopened it.
 * - A tap, a click or Enter/Space on the button toggles its panel here,
 *   and Reka's own click on the trigger is kept from toggling it back
 *   (`onClickCapture` stops the click before the trigger sees it). The
 *   wrapper hydrates with the page and the lazy menu does not: with Reka
 *   owning the click, the first tap after a page load only hydrated the
 *   menu and opened nothing (real browser, 2026-11-12). A touch toggles on
 *   its `pointerup`, which arrives whatever hydration did to the button
 *   under the finger, and its own `click`, if one follows, is swallowed.
 * - Escape on a panel the mouse opened closes it where the focus is; Reka's
 *   way, focus back on the button, stays for a panel a click or the
 *   keyboard opened. A click outside is Reka's.
 *
 * Bind `onPointermove`, `onPointerleave`, `onPointerdown`, `onPointerup` and
 * `onClickCapture` on that element, which holds the names, the buttons and
 * the panel's viewport, and `onEscapeKeyDown` as the menu's `content`
 * handler.
 */
export function useMenuPanels(open: Ref<string | undefined>) {
  let closing: ReturnType<typeof setTimeout> | undefined
  // The panel the mouse opened, until it closes or something else opens one.
  let openedByMouse: string | undefined
  // The button a touch went down on, and the tap a click may still follow.
  let pressed: string | undefined
  let tapped: { section: string, at: number } | undefined
  // The section under the mouse; the one whose panel the mouse opened less
  // than 300ms ago; the one a click or Escape closed while the mouse may
  // still be on it.
  let hovered: string | undefined
  let hoverOpened: string | undefined
  let hoverOpenedTimer: ReturnType<typeof setTimeout> | undefined
  let closedByVisitor: string | undefined

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

  /** The section a target is in, and whether it is the section's button. */
  const sectionOf = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return undefined
    const element = target.closest('[data-menu-section]')
    const section = element?.getAttribute('data-menu-section')
    if (!element || !section) return undefined
    return { section, button: element.hasAttribute('data-menu-toggle') }
  }

  const toggle = (section: string) => {
    cancelClose()
    open.value = open.value === section ? '' : section
  }

  const disarmHoverOpened = () => {
    clearTimeout(hoverOpenedTimer)
    hoverOpenedTimer = undefined
    hoverOpened = undefined
  }
  const armHoverOpened = (section: string) => {
    disarmHoverOpened()
    hoverOpened = section
    hoverOpenedTimer = setTimeout(disarmHoverOpened, HOVER_OPEN_CLICK_GUARD_MS)
  }

  /**
   * The mouse moved onto `section` (or off every section): leaving one
   * ends its click guard, as Reka's trigger's `pointerleave` does, and
   * entering one lets the mouse open it again, as its `pointerenter` does.
   */
  const hover = (section: string | undefined) => {
    if (section === hovered) return
    if (hovered !== undefined) disarmHoverOpened()
    hovered = section
    if (section !== undefined && section === closedByVisitor) closedByVisitor = undefined
  }

  function onPointermove(event: PointerEvent) {
    if (event.pointerType !== 'mouse' || !(event.target instanceof Element)) return
    const hit = sectionOf(event.target)
    hover(hit?.section)
    if (hit) {
      cancelClose()
      if (hit.section === closedByVisitor || hit.section === hoverOpened) return
      openedByMouse = hit.section
      open.value = hit.section
      armHoverOpened(hit.section)
    }
    else if (event.target.closest('[data-slot="viewport"]')) {
      cancelClose()
    }
    else {
      closeSoon()
    }
  }

  function onPointerleave(event: PointerEvent) {
    if (event.pointerType !== 'mouse') return
    hover(undefined)
    closeSoon()
  }

  function onPointerdown(event: PointerEvent) {
    tapped = undefined
    const hit = sectionOf(event.target)
    pressed = event.pointerType !== 'mouse' && hit?.button ? hit.section : undefined
  }

  function onPointerup(event: PointerEvent) {
    const hit = sectionOf(event.target)
    if (!pressed || event.pointerType === 'mouse' || !hit?.button || hit.section !== pressed) return
    pressed = undefined
    tapped = { section: hit.section, at: event.timeStamp }
    toggle(hit.section)
  }

  function onClickCapture(event: MouseEvent) {
    const hit = sectionOf(event.target)
    if (!hit?.button) return
    // Reka's trigger would toggle it too: one toggle per activation.
    event.stopPropagation()
    if (tapped && tapped.section === hit.section && event.timeStamp - tapped.at < TAP_CLICK_WINDOW_MS) {
      // The tap's own click: the tap already toggled.
      tapped = undefined
      return
    }
    tapped = undefined
    // Reka's trigger: the click that follows the hover which just opened it.
    if (hit.section === hoverOpened) return
    const closesIt = open.value === hit.section
    toggle(hit.section)
    if (closesIt) closedByVisitor = hit.section
    else if (closedByVisitor === hit.section) closedByVisitor = undefined
  }

  /**
   * Escape on a panel the MOUSE opened closes it where the focus is: Reka
   * would move the focus to the panel's button, which the visitor never
   * touched. A panel the keyboard or a click opened keeps Reka's way,
   * focus back on its button. Bound as the menu's `content` handler.
   */
  function onEscapeKeyDown(event: KeyboardEvent) {
    // Whoever opened it, the mouse does not reopen what Escape closed.
    if (open.value) closedByVisitor = open.value
    if (!open.value || open.value !== openedByMouse) return
    event.preventDefault()
    cancelClose()
    open.value = ''
  }

  onScopeDispose(() => {
    cancelClose()
    disarmHoverOpened()
  })

  return { onPointermove, onPointerleave, onPointerdown, onPointerup, onClickCapture, onEscapeKeyDown }
}
