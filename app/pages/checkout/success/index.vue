<script lang="ts" setup>
defineRouteRules({
  robots: false,
})
definePageMeta({
  layout: 'default',
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('checkout-success', tenantStore.schemaName))
</script>

<template>
  <!-- In the browser only: the order is in this tab's storage, which a server
       render cannot read (`app/utils/checkoutArrival.ts`). -->
  <ClientOnly>
    <component
      :is="body"
    />
  </ClientOnly>
</template>
