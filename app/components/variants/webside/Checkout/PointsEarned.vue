<script lang="ts" setup>
/**
 * Checkout Points Earned Component
 *
 * Displays the total loyalty points the user will earn from the current cart purchase.
 * Fetches product points for each unique cart item in parallel and computes the total.
 * Renders nothing when not authenticated, loading failed, or loyalty is disabled.
 */

const { t } = useStoreI18n('components/variants/webside/Checkout/PointsEarned')
const { shouldFetch, loading, totalPointsEarned, shouldShow } = useCartPointsEarned()
</script>

<template>
  <!--
    ClientOnly: `shouldFetch` depends on the session (loggedIn), which
    only settles on the client. Rendering the component during SSR produced a
    comment node ("shouldFetch" false) while the client hydrated as
    a <div>, tripping a Vue hydration mismatch on /checkout. Keeping
    the whole thing client-only is the right call — this is a
    logged-in perks indicator, not SEO-critical content.
  -->
  <ClientOnly>
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
          variant="solid"
          size="lg"
          class="shrink-0 tabular-nums font-bold"
        >
          +{{ totalPointsEarned }}
        </UBadge>
      </div>
    </div>
  </ClientOnly>
</template>

<i18n lang="yaml">
el:
  earn_with_order: "Θα κερδίσεις {points} πόντους"
  earn_description: "Οι πόντοι πιστώνονται μετά την ολοκλήρωση της παραγγελίας"
</i18n>
