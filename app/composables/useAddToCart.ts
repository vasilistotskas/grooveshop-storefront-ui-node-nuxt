/**
 * The click of an add-to-cart button, apart from its drawing (`Button/Product/AddToCart`
 * and the tenants' own): a quantity change if the product is already a line,
 * else a new line.
 *
 * The shopper hears from it at once: the "Adding…" toast opens on the click,
 * before any request, and the answer replaces it in place: `onAdded` shows
 * the confirmation (in the same toast, or the cart drawer), a failure becomes
 * the error toast. Stock and purchasability are Django's to judge, so "Added"
 * is never shown before it answers. Return the promise from the click
 * handler, so `UButton`'s `loading-auto` follows it.
 *
 * The toast words (`toast.adding_title`, `toast.failed_title`,
 * `toast.failed_description`) are the drawing's, passed as its `t`.
 */
export function useAddToCart(options: {
  t: ReturnType<typeof useI18n>['t']
  productId: Ref<number>
  quantity: Ref<number>
  /** The product's name, shown under "Adding…". */
  name: Ref<string | undefined>
  /** Runs once the cart holds the line: the confirmation. */
  onAdded: () => void
}) {
  const { t, productId, quantity, name, onAdded } = options
  const cartStore = useCartStore()
  const { error } = storeToRefs(cartStore)
  const toast = useToast()
  const { notify } = useApiError()
  const loadingIcon = useAppConfig().ui.icons.loading

  async function addToCart() {
    showOrUpdateToast(toast, CART_ADD_TOAST_ID, pendingToastContent(loadingIcon, {
      title: t('toast.adding_title'),
      description: name.value,
    }))

    try {
      const existingCartItem = cartStore.getCartItemByProductId(productId.value)
      if (existingCartItem) {
        await cartStore.updateCartItem(existingCartItem.id, {
          quantity: (existingCartItem.quantity || 0) + quantity.value,
        })
      }
      else {
        await cartStore.createCartItem({
          product: productId.value,
          quantity: quantity.value,
        })
      }
    }
    catch {
      // A swallowed failure is worse than an error: the shopper clicks
      // Buy, the cart badge does not move, and nothing at all says why.
      // Measured on staging — an add that never reached the API produced
      // no toast, no console error and no cart change. The store's own
      // messages are surfaced here; this is the fallback for everything
      // else, including a network that simply was not there.
      notify(CART_ADD_TOAST_ID, error.value, {
        title: t('toast.failed_title'),
        fallback: t('toast.failed_description'),
      })
      return
    }

    onAdded()
  }

  return { addToCart }
}
