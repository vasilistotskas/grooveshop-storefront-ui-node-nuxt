<script lang="ts" setup>
defineRouteRules({
  robots: false,
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('account-2fa-webauthn', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
