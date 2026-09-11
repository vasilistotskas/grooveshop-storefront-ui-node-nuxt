import type { FormErrorEvent } from '@nuxt/ui'

/**
 * Take the shopper to the first field that failed validation.
 *
 * A long form — checkout, signup, an address — can fail on a field that
 * is nowhere near the button that was just pressed. Nuxt UI renders the
 * message beside the field and leaves the page where it is, so the
 * submit looks like it did nothing: the shopper presses again, gets the
 * same silence, and leaves. Scroll the field into view and focus it, so
 * the message is on screen and typing continues where the problem is.
 *
 * Focus moves first with `preventScroll` so the browser's own jump does
 * not fight the smooth scroll that follows, and the field is centred
 * rather than pinned under a sticky header. A field the shopper cannot
 * see is not skipped silently — if its element is missing (a step that
 * is no longer rendered), nothing scrolls and the message still shows.
 *
 * Honours `prefers-reduced-motion`: an animated jump is exactly what
 * that setting exists to prevent.
 */
export function scrollToFirstFormError(event: FormErrorEvent): void {
  if (!import.meta.client) return

  const firstError = event?.errors?.[0]
  if (!firstError?.id) return

  const element = document.getElementById(firstError.id)
  if (!element) return

  const prefersReducedMotion
    = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

  element.scrollIntoView({
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
    block: 'center',
  })

  // Focus on the NEXT frame, with scrolling prevented so it cannot
  // fight the scroll above. Nuxt UI disables every element in the form
  // while a submit is in flight (`loadingAuto`), and its own docs note
  // that this drops focus — so focusing synchronously here left the
  // field scrolled into view but not focused, verified on production.
  if (typeof element.focus === 'function') {
    requestAnimationFrame(() => element.focus({ preventScroll: true }))
  }
}
