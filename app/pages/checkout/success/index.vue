<script lang="ts" setup>
// Client only: the order's id is in this tab's history state, which a server
// render cannot read (`app/utils/checkoutArrival.ts`).
defineRouteRules({
  robots: false,
  ssr: false,
})
definePageMeta({
  layout: 'default',
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('checkout-success', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
