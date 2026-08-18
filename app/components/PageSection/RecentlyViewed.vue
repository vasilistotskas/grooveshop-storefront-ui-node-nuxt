<script lang="ts" setup>
defineProps<{
  title?: string
}>()

// Admin-toggleable rail — extra-setting RECENTLY_VIEWED_ENABLED.
// Resolved client-side only (``server: false``) with a default of
// ``True``: the rail it gates — ``ProductRecentlyViewed`` — is itself
// client-only (reads localStorage), so the flag has no effect on the
// SSR'd markup and never needs to be on the critical render path. The
// Django default is ``true``, so the rail shows unless an admin
// explicitly disabled it; the client fetch reconciles that shortly
// after hydration. Keeping this off SSR removes a blocking backend
// round-trip from the homepage TTFB.
// Explicit ``useAsyncData<T>`` annotation: Nuxt 4.4.8 tightened the
// default-factory inference and the chained ``.catch(() => ({ value }))``
// causes the resolved-union to collapse to ``string`` — making the
// ``default`` factory fail the overload check. Pinning the generic
// restores the intended ``{ value?: string }`` shape.
const { data: recentlyViewedSetting } = await useAsyncData<{ value?: string }>(
  'home:recently-viewed-enabled',
  () => $fetch<{ value?: string }>('/api/settings/get', {
    query: { key: 'RECENTLY_VIEWED_ENABLED' },
  }).catch(() => ({ value: 'False' })),
  {
    server: false,
    default: () => ({ value: 'False' }),
  },
)
const recentlyViewedEnabled = computed(() => {
  const raw = (recentlyViewedSetting.value?.value ?? 'true').toString().toLowerCase()
  return raw === 'true' || raw === '1' || raw === 'yes'
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
    class="
      mx-auto w-full max-w-main
      md:p-0!
    "
  />
</template>
