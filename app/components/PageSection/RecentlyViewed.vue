<script lang="ts" setup>
defineProps<{
  title?: string
}>()

// Admin-toggleable rail — extra-setting RECENTLY_VIEWED_ENABLED.
// Fails CLOSED: a rail that pops in beats one that flashes and
// vanishes when an admin has disabled it. The flag rides the one
// per-render settings payload, so reading it on the server no longer
// costs a round trip of its own; the rail it gates
// (``ProductRecentlyViewed``) reads localStorage and stays client-only.
const recentlyViewedEnabled = useSettingFlag('RECENTLY_VIEWED_ENABLED', {
  fallback: false,
})
</script>

<template>
  <!-- Recently viewed rail: rendered client-side from localStorage
       so returning visitors land on products they were eyeing.
       Hidden when history is empty.

       Uses the non-lazy variant — ``<LazyProductRecentlyViewed
       hydrate-on-visible>`` combined with the component's inner
       ``<ClientOnly>`` deadlocks: SSR renders nothing (fallback),
       ``hydrate-on-visible`` has no DOM node to observe, and
       hydration never fires. Plain render ships the component's
       setup on every client load so ``useRecentlyViewed`` can
       read localStorage and populate the carousel. -->
  <ProductRecentlyViewed
    v-if="recentlyViewedEnabled"
    class="w-full md:p-0!"
  />
</template>
