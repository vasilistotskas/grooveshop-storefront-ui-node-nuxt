<script lang="ts" setup>
const { t } = useI18n()
const localePath = useLocalePath()

const cartStore = useCartStore()
const { cart } = storeToRefs(cartStore)

const loyalty = useLoyalty()
const { data: settings } = loyalty.fetchSettings()

const enabled = computed(() => settings.value?.enabled ?? false)

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
    class="
      relative overflow-hidden rounded-lg
      bg-gradient-to-br from-primary-50 to-secondary-50
      dark:from-primary-950 dark:to-secondary-950
      ring-1 ring-primary-200 dark:ring-primary-800
      p-4
    "
  >
    <!-- Decorative background circles -->
    <div
      class="
        pointer-events-none absolute -right-4 -top-4
        size-20 rounded-full
        bg-secondary-200/40 dark:bg-secondary-700/20
      "
    />
    <div
      class="
        pointer-events-none absolute -bottom-2 -left-2
        size-12 rounded-full
        bg-primary-200/30 dark:bg-primary-700/15
      "
    />

    <div class="relative flex items-start gap-3">
      <!-- Points badge -->
      <div class="flex shrink-0 items-center justify-center">
        <div class="relative flex size-12 items-center justify-center">
          <svg viewBox="0 0 100 100" class="absolute inset-0 size-full">
            <polygon
              points="50 1 95 25 95 75 50 99 5 75 5 25"
              class="fill-secondary-100 stroke-secondary-400 dark:fill-secondary-900 dark:stroke-secondary-500"
              stroke-width="2"
            />
          </svg>
          <span class="relative z-10 text-sm font-bold text-secondary-900 dark:text-secondary-100">
            +{{ estimatedPoints }}
          </span>
        </div>
      </div>

      <!-- Content -->
      <div class="min-w-0 flex-1 space-y-2">
        <p class="text-sm font-semibold text-primary-900 dark:text-primary-100">
          {{ t('title', { points: estimatedPoints }) }}
        </p>
        <p class="text-xs leading-relaxed text-primary-700 dark:text-primary-300">
          {{ t('description') }}
        </p>

        <UButton
          size="sm"
          color="primary"
          variant="soft"
          :to="localePath('account-signup')"
          icon="i-heroicons-arrow-right-20-solid"
          trailing
        >
          {{ t('cta') }}
        </UButton>
      </div>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  title: "Κέρδισε {points} πόντους με αυτήν την παραγγελία!"
  description: "Δημιούργησε δωρεάν λογαριασμό και κέρδισε πόντους που μετατρέπονται σε εκπτώσεις."
  cta: "Εγγραφή"
</i18n>
