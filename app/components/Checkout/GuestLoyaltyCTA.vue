<script lang="ts" setup>
/**
 * A guest's invitation to the store's points on the payment page: what
 * this order would earn (the items' total by the earning factor) and a
 * link to sign up. Self-gated on the store's program.
 */
const { t, n } = useI18n()
const localePath = useLocalePath()

const cartStore = useCartStore()
const { cart } = storeToRefs(cartStore)

const tenantStore = useTenantStore()
const loyalty = useLoyalty()
const { data: settings } = loyalty.fetchSettings()

// Tenant plan flag is the primary gate; runtime toggle is the operational lever.
const enabled = computed(() => tenantStore.loyaltyEnabled && (settings.value?.enabled ?? false))

// Estimate points the guest could earn: floor(cartTotal * pointsFactor)
const estimatedPoints = computed(() => {
  if (!cart.value || !settings.value) return 0
  return Math.floor(cart.value.totalPrice * settings.value.pointsFactor)
})

const shouldShow = computed(() => enabled.value && estimatedPoints.value > 0)
</script>

<template>
  <div
    v-if="shouldShow"
    class="flex items-start gap-3 rounded-xl bg-(--ui-secondary-soft) p-4 text-sm"
  >
    <UIcon
      name="i-lucide-sparkles"
      class="mt-0.5 size-4 shrink-0 text-highlighted"
    />
    <div class="flex min-w-0 flex-col gap-1">
      <p class="font-semibold text-highlighted">
        {{ t('title', { points: n(estimatedPoints) }, estimatedPoints) }}
      </p>
      <p class="text-toned">
        {{ t('description') }}
      </p>
      <ULink
        :to="localePath('account-signup')"
        class="font-semibold text-accent"
      >
        {{ t('cta') }}
      </ULink>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  title: "Κέρδισε {points} πόντο με αυτή την παραγγελία | Κέρδισε {points} πόντους με αυτή την παραγγελία"
  description: Δημιούργησε δωρεάν λογαριασμό και κάνε τους πόντους εκπτώσεις.
  cta: Δημιουργία λογαριασμού
en:
  title: "Earn {points} point on this order | Earn {points} points on this order"
  description: Create a free account and turn points into discounts.
  cta: Create an account
</i18n>
