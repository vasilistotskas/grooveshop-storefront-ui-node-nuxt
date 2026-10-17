type Toaster = ReturnType<typeof useToast>
type ToastContent = Parameters<Toaster['update']>[1]

/** The one "added to cart" toast every add-to-cart button, in every tree, shares. */
export const ADDED_TO_CART_TOAST_ID = 'cart:added'

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
  if (toast.toasts.value.some(item => item.id === id)) {
    toast.update(id, content)
  }
  else {
    toast.add({ id, ...content })
  }
}
