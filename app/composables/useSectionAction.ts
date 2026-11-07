/**
 * What a section's button does, apart from its drawing, so every design draws
 * its own button and the behaviour exists once. The closed set of actions is
 * `BUILDER_ACTION_TARGETS`; what reaches here is ready to run (`readyActions`).
 *
 * A component binds the three parts to its own button:
 * - `to`: where a link goes, `undefined` for an action that stays on the page,
 *   which draws a `<button>` (`UButton` does so by itself);
 * - `label`: `text`, or "unavailable" for a product that cannot be added;
 * - `control`: the click and its states. Empty for a link, so a button that
 *   only links renders exactly what it always did.
 *
 * Its words are in the global locale files, under `section_action`: a composable
 * has no `<i18n>` block, and six components in two designs draw it.
 */
export function useSectionAction(action: () => ReadyAction | undefined, text: () => string | undefined) {
  const { t: globalT } = useI18n({ useScope: 'global' })
  const t = ((key: string, ...rest: unknown[]) => (globalT as (...args: unknown[]) => string)(`section_action.${key}`, ...rest)) as ReturnType<typeof useI18n>['t']
  const toast = useToast()
  const { loggedIn, user } = useUserSession()
  const userStore = useUserStore()

  const kind = computed(() => action()?.kind)
  const product = computed(() => {
    const current = action()
    return current && 'product' in current ? current.product.value : undefined
  })

  const { disabled: unavailable, addToCart } = useAddToCartControl({
    t,
    product: computed(() => kind.value === 'addToCart' ? product.value : undefined),
    quantity: ref(1),
  })
  const adding = ref(false)
  async function runAddToCart() {
    adding.value = true
    try {
      await addToCart()
    }
    finally {
      adding.value = false
    }
  }

  const favouriteId = computed(() => product.value ? userStore.getFavouriteIdByProductId(product.value.id) ?? null : null)
  const { isLoading: savingFavourite, toggle } = useProductFavouriteToggle({
    productId: () => product.value?.id ?? 0,
    userId: () => user.value?.id,
    favouriteId: () => favouriteId.value,
    t,
    onDeleted: () => undefined,
  })

  // Which products the shopper has saved is theirs alone, so it is asked in the
  // browser, after hydration: the page itself is cached for everyone.
  onMounted(() => {
    watchEffect(async () => {
      if (kind.value !== 'addToWishlist' || !product.value || !loggedIn.value) return
      try {
        userStore.updateFavouriteProducts(await $api('/api/products/favourites/favourites-by-products', {
          method: 'POST',
          body: { productIds: [product.value.id] },
        }))
      }
      catch (error) {
        // The button still works: saving a product twice is Django's to refuse.
        log.error({ action: 'section-action:favourites', error })
      }
    })
  })

  // `legacy`: the button is in the server's render, so it must not depend on an API only some browsers offer.
  // It reports no failure that way, which the toast survives: it names the code.
  const { copy } = useClipboard({ legacy: true })
  async function runCopy(code: string) {
    await copy(code)
    toast.add({ title: t('copied', { code }), color: 'success' })
  }

  const to = computed(() => {
    const current = action()
    return current?.kind === 'link' ? current.to : undefined
  })
  const label = computed(() => kind.value === 'addToCart' && unavailable.value ? t('unavailable') : text())
  const control = computed(() => {
    const current = action()
    switch (current?.kind) {
      case 'addToCart':
        return { onClick: runAddToCart, loading: adding.value, disabled: unavailable.value }
      case 'addToWishlist':
        return { 'onClick': toggle, 'loading': savingFavourite.value, 'aria-pressed': favouriteId.value !== null }
      case 'copyCode': {
        const { code } = current.promotion.value
        return { onClick: () => runCopy(code) }
      }
      default:
        return {}
    }
  })

  return { to, label, control }
}
