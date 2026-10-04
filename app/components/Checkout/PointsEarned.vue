<script lang="ts" setup>
/**
 * The points the order will earn, as a line under the summary's total
 * (cart and checkout). Fetches each distinct product's points in
 * parallel and totals them by quantity. Renders nothing for a guest, on
 * a failed load, or when the store's program is off.
 */

const { t, n } = useI18n()
const { loggedIn } = useUserSession()

const cartStore = useCartStore()
const { cart, getCartItems } = storeToRefs(cartStore)

const tenantStore = useTenantStore()
const loyalty = useLoyalty()

// Fetch loyalty settings
const { data: settings } = loyalty.fetchSettings()

// Wholesale carts sit outside the loyalty program unless the merchant
// opts in (B2B_LOYALTY_ENABLED). The backend awards nothing for them,
// so promising points here would advertise a reward never granted.
const b2bSuppressesLoyalty = computed(() => {
  const b2b = cart.value?.b2bPricing
  return Boolean(b2b?.applied) && !b2b?.allowLoyalty
})

// State for computed points
const pointsPerProduct = ref<Map<number, number>>(new Map())
const loading = ref(false)
const hasError = ref(false)

// Tenant plan flag is the primary gate; runtime toggle is the operational lever.
const shouldFetch = computed(() => loggedIn.value
  && tenantStore.loyaltyEnabled
  && settings.value?.enabled
  && !b2bSuppressesLoyalty.value)

// Total points earned for the entire cart
const totalPointsEarned = computed(() => {
  let total = 0
  for (const item of getCartItems.value) {
    const points = pointsPerProduct.value.get(item.product.id) ?? 0
    total += points * (item.quantity || 1)
  }
  return total
})

const shouldShow = computed(() => {
  return shouldFetch.value && !loading.value && !hasError.value && totalPointsEarned.value > 0
})

// Fetch points for all cart products in parallel
const fetchAllProductPoints = async () => {
  if (!shouldFetch.value || getCartItems.value.length === 0) return

  loading.value = true
  hasError.value = false

  try {
    // Get unique product IDs
    const uniqueProductIds = [...new Set(getCartItems.value.map(item => item.product.id))]

    // Fetch points for all products in parallel
    const results = await Promise.all(
      uniqueProductIds.map(async (productId) => {
        try {
          const data = await $api<ProductPoints>(`/api/loyalty/product/${productId}/points`, {
            method: 'GET',
          })
          return { productId, points: data.potentialPoints }
        }
        catch {
          // Silent failure for individual product — non-critical feature
          return { productId, points: 0 }
        }
      }),
    )

    // Build the map
    const newMap = new Map<number, number>()
    for (const result of results) {
      newMap.set(result.productId, result.points)
    }
    pointsPerProduct.value = newMap
  }
  catch {
    hasError.value = true
  }
  finally {
    loading.value = false
  }
}

// Fetch on mount and when cart items change
watch(
  [shouldFetch, () => getCartItems.value.map(i => `${i.product.id}:${i.quantity}`).join(',')],
  () => {
    fetchAllProductPoints()
  },
  { immediate: true },
)
</script>

<template>
  <!--
    ClientOnly: `shouldFetch` depends on the session (loggedIn) and a
    lazy-loaded loyalty-settings fetch, both of which only settle on
    the client; rendering it on the server tripped a hydration mismatch.
    A logged-in perk, not SEO content.
  -->
  <ClientOnly>
    <template v-if="shouldFetch">
      <USkeleton
        v-if="loading"
        class="h-5 w-48"
      />
      <p
        v-else-if="shouldShow"
        class="flex items-center gap-2 text-sm font-medium text-accent"
      >
        <UIcon
          name="i-lucide-sparkles"
          class="size-4 shrink-0"
        />
        {{ t('earn_with_order', { points: n(totalPointsEarned) }, totalPointsEarned) }}
      </p>
    </template>
  </ClientOnly>
</template>

<i18n lang="yaml">
el:
  earn_with_order: "Θα κερδίσεις {points} πόντο | Θα κερδίσεις {points} πόντους"
en:
  earn_with_order: "You'll earn {points} point | You'll earn {points} points"
</i18n>
