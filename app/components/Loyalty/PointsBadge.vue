<script lang="ts" setup>
/**
 * "Earn N points" beside the product's price, for every shopper.
 *
 * A signed-in shopper sees the points Django works out for them, their
 * tier's multiplier included; anyone else sees the store's base rate on
 * the price (`pointsFactor`), which is what an account would earn. One
 * badge in both cases, so the line under the price does not change shape
 * when the session arrives after hydration — only the number can.
 *
 * Renders nothing on a store without loyalty (the plan flag AND the
 * merchant's setting, as every loyalty surface gates), and nothing when
 * there are no points to promise. Django refuses the points of a store
 * without either, so the request is gated the same way.
 */
const props = defineProps<{
  productId: number
  /** The price the shopper pays, for the signed-out estimate. */
  productPrice: number
}>()

const { t } = useI18n()
const { loggedIn } = useUserSession()
const tenantStore = useTenantStore()
const loyalty = useLoyalty()

// Awaited so the server knows, before it registers the points fetch,
// whether there are points to ask for. Shared with the navbar and the
// checkout, so it costs no extra request.
const { data: settings } = await loyalty.fetchSettings()

const enabled = computed(() => tenantStore.loyaltyEnabled && (settings.value?.enabled ?? false))
const { data: productPoints } = loyalty.fetchProductPoints(
  props.productId,
  () => loggedIn.value && enabled.value,
)

const points = computed(() => {
  if (!enabled.value) return 0
  if (loggedIn.value && productPoints.value) return productPoints.value.potentialPoints
  return Math.floor(props.productPrice * (settings.value?.pointsFactor ?? 0))
})
</script>

<template>
  <UBadge
    v-if="points > 0"
    icon="i-lucide-sparkles"
    color="secondary"
    variant="soft"
    :label="t('earn_points', { points })"
  />
</template>

<i18n lang="yaml">
el:
  earn_points: "Κέρδισε {points} πόντους"
en:
  earn_points: "Earn {points} points"
</i18n>
