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
 * Renders nothing on a store without the loyalty feature, and nothing
 * when there are no points to promise. `useLoyalty` asks for no points
 * on such a store; the signed-in shopper is this badge's own condition.
 */
const props = defineProps<{
  productId: number
  /** The price the shopper pays, for the signed-out estimate. */
  productPrice: number
}>()

const { t } = useI18n()
const { loggedIn } = useUserSession()
const loyalty = useLoyalty()

const settings = useLoyaltySettings()

const enabled = useStoreFeature('loyalty')
const { data: productPoints } = loyalty.fetchProductPoints(props.productId, loggedIn)

const points = computed(() => {
  if (!enabled.value) return 0
  if (loggedIn.value && productPoints.value) return productPoints.value.potentialPoints
  if (!settings.value) return 0
  return Math.floor(props.productPrice * settings.value.pointsFactor)
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
