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
const loyalty = useLoyalty()

// Fetch loyalty settings and product points
const { data: settings } = loyalty.fetchSettings()
const { data: productPoints, status } = loyalty.fetchProductPoints(props.productId)

// Computed states
const loading = computed(() => status.value === 'pending')
const shouldFetch = computed(() => loggedIn.value && settings.value?.enabled)
const shouldShow = computed(() => shouldFetch.value && productPoints.value !== null)
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
  </div>
</template>

<i18n lang="yaml">
el:
  earn_points: "Κέρδισε {points} πόντους"
  tier_bonus: "Μπόνους βαθμίδας"
  tier_bonus_tooltip: "Εφαρμόστηκε πολλαπλασιαστής βαθμίδας"
</i18n>
