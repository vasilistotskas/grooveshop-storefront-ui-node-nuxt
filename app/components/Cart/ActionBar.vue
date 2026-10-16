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
</script>

<template>
  <!-- Docked above the tab bar when there is one (`--dock-*` in
       main.css). -->
  <div
    data-dock="bar"
    class="
      fixed inset-x-3 bottom-[calc(var(--dock-base)+var(--dock-tabbar))] z-40
      flex h-(--dock-bar-height) items-center gap-3 rounded-[1.125rem] border
      border-default bg-default ps-4 pe-2.5 shadow-(--ui-overlay-shadow)
      lg:hidden
    "
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
