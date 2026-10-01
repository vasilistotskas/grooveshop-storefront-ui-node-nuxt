<script lang="ts" setup>
/**
 * Loyalty Points Badge Component
 *
 * Displays potential loyalty points a user can earn by purchasing a product.
 * Shows tier bonus indicator when applicable.
 * Renders nothing when not authenticated, loading, on error, or when loyalty is disabled (silent failure).
 */

const props = defineProps<{
  productId: number
}>()

const { t } = useI18n()
const { loggedIn } = useUserSession()
const tenantStore = useTenantStore()
const loyalty = useLoyalty()

// Awaited so the server knows, before it registers the points fetch,
// whether there are points to ask for. Shared with the navbar and the
// CTAs, so it costs no extra request.
const { data: settings } = await loyalty.fetchSettings()

// The store's plan AND the merchant's setting, as every loyalty surface
// gates; Django refuses the points of a store without either.
const shouldFetch = computed(() =>
  loggedIn.value && tenantStore.loyaltyEnabled && (settings.value?.enabled ?? false))
const { data: productPoints, status } = loyalty.fetchProductPoints(props.productId, shouldFetch)

const loading = computed(() => status.value === 'pending')
const shouldShow = computed(() => shouldFetch.value && productPoints.value != null)
</script>

<template>
  <!-- Always render a container to prevent layout shift -->
  <div v-if="shouldFetch" class="flex items-center gap-2 min-h-8">
    <!-- Skeleton placeholder during loading -->
    <USkeleton v-if="loading" class="h-8 w-32" />

    <!-- Badge content -->
    <UBadge
      v-else-if="shouldShow && productPoints"
      color="secondary"
      size="lg"
      variant="soft"
      class="flex items-center gap-1.5"
    >
      <UIcon name="i-heroicons-star" class="h-4 w-4" />
      <span>{{ t('earn_points', { points: productPoints.potentialPoints }) }}</span>
    </UBadge>
    <UBadge
      v-if="shouldShow && productPoints?.tierMultiplierApplied"
      color="primary"
      size="lg"
      variant="subtle"
      :title="t('tier_bonus_tooltip')"
    >
      {{ t('tier_bonus') }}
    </UBadge>
  </div>
</template>

<i18n lang="yaml">
el:
  earn_points: "Κέρδισε {points} πόντους"
  tier_bonus: "Μπόνους βαθμίδας"
  tier_bonus_tooltip: "Εφαρμόστηκε πολλαπλασιαστής βαθμίδας"
en:
  earn_points: "Earn {points} points"
  tier_bonus: "Tier bonus"
  tier_bonus_tooltip: "Your tier multiplier was applied"
</i18n>
