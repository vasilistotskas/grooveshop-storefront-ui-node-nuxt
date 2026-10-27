/**
 * The loyalty points the cart will earn, apart from its drawing
 * (`Checkout/PointsEarned` and the tenants' own): each distinct product's
 * points, read in parallel and totalled by quantity.
 *
 * Asked only for a signed-in shopper of a store whose programme is on
 * (`shouldFetch`), and never for a wholesale cart outside the programme
 * (Django awards a B2B cart nothing unless the merchant opts it in,
 * `allowLoyalty`), so the line never promises points that are not
 * granted. Read again whenever a product or a quantity changes.
 * `shouldShow` is false while loading, after a failed read, and for a
 * total of zero.
 */
export function useCartPointsEarned() {
  const { loggedIn } = useUserSession()
  const { cart, getCartItems } = storeToRefs(useCartStore())
  const loyalty = useLoyalty()
  const loyaltyEnabled = useStoreFeature('loyalty')

  const b2bSuppressesLoyalty = computed(() => {
    const b2b = cart.value?.b2bPricing
    return Boolean(b2b?.applied) && !b2b?.allowLoyalty
  })

  const pointsPerProduct = ref<Map<number, number>>(new Map())
  const loading = ref(false)
  const hasError = ref(false)

  const shouldFetch = computed(() => loggedIn.value
    && loyaltyEnabled.value
    && !b2bSuppressesLoyalty.value)

  const totalPointsEarned = computed(() => {
    let total = 0
    for (const item of getCartItems.value) {
      const points = pointsPerProduct.value.get(item.product.id) ?? 0
      total += points * (item.quantity || 1)
    }
    return total
  })

  const shouldShow = computed(() =>
    shouldFetch.value && !loading.value && !hasError.value && totalPointsEarned.value > 0)

  async function fetchAllProductPoints() {
    if (!shouldFetch.value || getCartItems.value.length === 0) return

    loading.value = true
    hasError.value = false

    try {
      const uniqueProductIds = [...new Set(getCartItems.value.map(item => item.product.id))]
      pointsPerProduct.value = await loyalty.fetchPointsPerProduct(uniqueProductIds)
    }
    catch {
      hasError.value = true
    }
    finally {
      loading.value = false
    }
  }

  watch(
    [shouldFetch, () => getCartItems.value.map(item => `${item.product.id}:${item.quantity}`).join(',')],
    () => {
      fetchAllProductPoints()
    },
    { immediate: true },
  )

  return { shouldFetch, loading, totalPointsEarned, shouldShow }
}
