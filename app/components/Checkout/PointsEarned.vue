<script lang="ts" setup>
/**
 * Checkout Points Earned Component
 *
 * Displays the total loyalty points the user will earn from the current cart purchase.
 * Fetches product points for each unique cart item in parallel and computes the total.
 * Renders nothing when not authenticated, loading failed, or loyalty is disabled.
 */

const { t } = useI18n()
const { loggedIn } = useUserSession()

const cartStore = useCartStore()
const { getCartItems } = storeToRefs(cartStore)

const loyalty = useLoyalty()

// Fetch loyalty settings
const { data: settings } = loyalty.fetchSettings()

// State for computed points
const pointsPerProduct = ref<Map<number, number>>(new Map())
const loading = ref(false)
const hasError = ref(false)

const shouldFetch = computed(() => loggedIn.value && settings.value?.enabled)

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
          const data = await $fetch<ProductPoints>(`/api/loyalty/product/${productId}/points`, {
            method: 'GET',
            headers: useRequestHeaders(),
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
  <div v-if="shouldFetch">
    <!-- Skeleton loading -->
    <USkeleton v-if="loading" class="h-14 w-full rounded-lg" />

    <!-- Points earned display -->
    <div
      v-else-if="shouldShow"
      class="
        flex items-center gap-3 rounded-lg
        bg-secondary-100 p-3
        dark:bg-secondary-800
      "
    >
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-secondary-900 dark:text-secondary-100">
          {{ t('earn_with_order', { points: totalPointsEarned }) }}
        </p>
        <p class="text-xs text-secondary-800 dark:text-secondary-200">
          {{ t('earn_description') }}
        </p>
      </div>

      <UBadge
        color="neutral"
        variant="subtle"
        size="lg"
        class="shrink-0 tabular-nums font-bold"
      >
        +{{ totalPointsEarned }}
      </UBadge>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  earn_with_order: "Θα κερδίσεις {points} πόντους"
  earn_description: "Οι πόντοι πιστώνονται μετά την ολοκλήρωση της παραγγελίας"
</i18n>
