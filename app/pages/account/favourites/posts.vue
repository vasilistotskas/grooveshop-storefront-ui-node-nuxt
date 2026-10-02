<script lang="ts" setup>
definePageMeta({
  middleware: ['blog-enabled', 'favourites-enabled'],
})
defineRouteRules({
  robots: false,
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('account-favourites-posts', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
