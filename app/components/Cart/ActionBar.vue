<script lang="ts" setup>
/**
 * The phone's floating checkout bar on the cart page: the total and the
 * checkout button, above the tab bar when there is one, so checking out
 * never waits on a scroll past the lines. From `lg` up the summary
 * card's own button does the job and this bar is gone.
 */
defineProps<{
  total: number
  /** Stock problems keep the shopper from checking out until fixed. */
  blocked: boolean
}>()

const { t, n } = useI18n()
const localePath = useLocalePath()

const mobileBottomNavEnabled = useSettingFlag('MOBILE_BOTTOM_NAV_ENABLED', {
  fallback: true,
})
</script>

<template>
  <div
    class="
      fixed inset-x-3 z-40 flex items-center gap-3 rounded-[1.125rem] border
      border-default bg-default py-2.5 ps-4 pe-2.5
      shadow-(--ui-overlay-shadow)
      lg:hidden
    "
    :class="mobileBottomNavEnabled
      ? 'bottom-[calc(5.5rem+env(safe-area-inset-bottom))]'
      : 'bottom-[calc(0.75rem+env(safe-area-inset-bottom))]'"
  >
    <div class="flex min-w-0 flex-1 flex-col">
      <span class="text-xs text-toned">{{ t('total') }}</span>
      <span class="font-mono text-base font-bold tabular-nums text-highlighted">{{ n(total, 'currency') }}</span>
    </div>
    <UButton
      :to="localePath('checkout')"
      :disabled="blocked"
      :color="blocked ? 'warning' : 'secondary'"
      icon="i-lucide-lock"
      size="lg"
      class="shrink-0"
    >
      {{ blocked ? t('fix') : t('checkout') }}
    </UButton>
  </div>
</template>

<i18n lang="yaml">
el:
  total: Σύνολο
  checkout: Ολοκλήρωση
  fix: Διόρθωσε τα προβλήματα
en:
  total: Total
  checkout: Checkout
  fix: Fix the problems
</i18n>
