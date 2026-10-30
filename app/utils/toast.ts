type Toaster = ReturnType<typeof useToast>
type ToastContent = Parameters<Toaster['update']>[1]

/**
 * The one toast every add-to-cart button, in every tree, shares: "Adding…",
 * then "Added" or "Not added", in the same place.
 */
export const CART_ADD_TOAST_ID = 'cart:add'

/** The toast of a removed cart line: "Removing…", then "Removed" with "Undo", or the failure. */
export const CART_REMOVE_TOAST_ID = 'cart:remove'

/**
 * What a toast that other content replaces in place must forget: Nuxt UI's
 * `update()` and its `add()` with a known id MERGE into the toast that is
 * showing, so a pending toast's spinner, its missing countdown and its
 * never-closing duration would otherwise carry over to "Added".
 */
export const TOAST_RESET = {
  icon: undefined,
  avatar: undefined,
  actions: undefined,
  duration: undefined,
  progress: true,
  ui: undefined,
} satisfies ToastContent

/**
 * Content for a toast that says work is under way: the theme's loading icon
 * spinning (the toast has no loading prop), no countdown and no timeout, since
 * it stays until whatever it waits for answers and replaces it. The spin stops
 * for a visitor who asks for reduced motion.
 */
export function pendingToastContent(loadingIcon: string, content: { title: string, description?: string }): ToastContent {
  return {
    ...TOAST_RESET,
    ...content,
    color: 'neutral',
    icon: loadingIcon,
    duration: 0,
    progress: false,
    ui: { icon: 'animate-spin motion-reduce:animate-none' },
  }
}

/**
 * Open the toast `id`, or update it in place when it is already showing.
 *
 * A toast per call stacked up to five over half a phone screen when a
 * shopper tapped "add" a few times (owner review, 2026-10-16). Nuxt UI's
 * `update()` reopens the toast and restarts its timer, so it closes a
 * few seconds after the LAST call rather than the first
 * (ui.nuxt.com/docs/composables/use-toast).
 */
export function showOrUpdateToast(toast: Toaster, id: string, content: ToastContent): void {
  const next = { ...TOAST_RESET, ...content }
  if (toast.toasts.value.some(item => item.id === id)) {
    toast.update(id, next)
  }
  else {
    toast.add({ id, ...next })
  }
}
