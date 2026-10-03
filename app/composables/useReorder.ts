/**
 * "Buy again": put an order's products back in the cart and go to it —
 * the orders list and the order page both offer it.
 *
 * Django adds the lines server-side (`/api/orders/[id]/reorder`), which
 * bypasses the cart store's add actions, so each added line is reported
 * here to keep add-to-cart analytics complete, priced from the refreshed
 * cart. A product that is no longer sold is skipped and said so.
 */
export function useReorder() {
  const { $i18n } = useNuxtApp()
  const t = $i18n.t.bind($i18n)
  const toast = useToast()
  const localePath = useLocalePath()
  const cartStore = useCartStore()

  /** The order being put back in the cart, while its request runs. */
  const reordering = ref<number | null>(null)

  async function reorder(orderId: number) {
    if (reordering.value !== null) return
    reordering.value = orderId
    try {
      const result = await $api<ReorderResponse>(`/api/orders/${orderId}/reorder`, {
        method: 'POST',
      })
      await cartStore.refreshCart()

      for (const item of result.addedItems ?? []) {
        const added = Number(item.addedQuantity ?? item.requestedQuantity ?? 0)
        const cartItem = cartStore.getCartItemByProductId(item.productId)
        const unitPrice = Number(cartItem?.product?.finalPrice ?? cartItem?.product?.price ?? 0)
        cartStore.trackCartQuantityChange(item.productId, added, unitPrice)
      }

      const added = result.addedItems?.length ?? 0
      const skipped = result.skippedItems?.length ?? 0
      if (added === 0) {
        toast.add({
          title: t('reorder.empty_title'),
          description: t('reorder.empty_description'),
          color: 'warning',
          icon: 'i-lucide-triangle-alert',
        })
        return
      }

      toast.add({
        title: t('reorder.success_title'),
        description: skipped > 0
          ? t('reorder.success_with_skipped', { added, skipped })
          : t('reorder.success_description', { count: added }, added),
        color: 'success',
        icon: 'i-lucide-shopping-bag',
      })
      await navigateTo(localePath('cart'))
    }
    catch (error) {
      log.error({ action: 'order:reorder', error })
      toast.add({
        title: t('reorder.error_title'),
        description: t('reorder.error_description'),
        color: 'error',
        icon: 'i-lucide-circle-x',
      })
    }
    finally {
      reordering.value = null
    }
  }

  return { reorder, reordering }
}
