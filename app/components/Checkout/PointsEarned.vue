<script lang="ts" setup>
/**
 * The points the order will earn, as a line under the summary's total
 * (cart and checkout). Fetches each distinct product's points in
 * parallel and totals them by quantity. Renders nothing for a guest, on
 * a failed load, or when the store's program is off.
 */

const { t, n } = useI18n()
const { shouldFetch, loading, totalPointsEarned, shouldShow } = useCartPointsEarned()
</script>

<template>
  <!--
    ClientOnly: `shouldFetch` depends on the session (loggedIn), which
    only settles on the client; rendering it on the server tripped a
    hydration mismatch.
    A logged-in perk, not SEO content.
  -->
  <ClientOnly>
    <template v-if="shouldFetch">
      <USkeleton
        v-if="loading"
        class="h-5 w-48"
      />
      <p
        v-else-if="shouldShow"
        class="flex items-center gap-2 text-sm font-medium text-accent"
      >
        <UIcon
          name="i-lucide-sparkles"
          class="size-4 shrink-0"
        />
        {{ t('earn_with_order', { points: n(totalPointsEarned) }, totalPointsEarned) }}
      </p>
    </template>
  </ClientOnly>
</template>

<i18n lang="yaml">
el:
  earn_with_order: "Θα κερδίσεις {points} πόντο | Θα κερδίσεις {points} πόντους"
en:
  earn_with_order: "You'll earn {points} point | You'll earn {points} points"
</i18n>
