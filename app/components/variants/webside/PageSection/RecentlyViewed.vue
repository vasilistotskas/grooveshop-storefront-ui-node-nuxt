<script lang="ts" setup>
defineProps<{
  title?: string
}>()

// The store's recently-viewed preference. The rail it gates
// (``ProductRecentlyViewed``) reads localStorage and stays client-only.
const recentlyViewedEnabled = useStorePreference('recentlyViewed')
</script>

<template>
  <!-- Recently viewed rail: rendered client-side from localStorage
       so returning visitors land on products they were eyeing.
       Hidden when history is empty.

       Uses the non-lazy variant — ``<LazyWebsideProductRecentlyViewed
       hydrate-on-visible>`` combined with the component's inner
       ``<ClientOnly>`` deadlocks: SSR renders nothing (fallback),
       ``hydrate-on-visible`` has no DOM node to observe, and
       hydration never fires. Plain render ships the component's
       setup on every client load so ``useRecentlyViewed`` can
       read localStorage and populate the carousel. -->
  <WebsideProductRecentlyViewed
    v-if="recentlyViewedEnabled"
    class="w-full md:p-0!"
  />
</template>
