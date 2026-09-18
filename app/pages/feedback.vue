<script lang="ts" setup>
defineRouteRules({
  robots: false,
})
definePageMeta({
  layout: 'default',
  middleware: ['feedback-enabled'],
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('feedback', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
