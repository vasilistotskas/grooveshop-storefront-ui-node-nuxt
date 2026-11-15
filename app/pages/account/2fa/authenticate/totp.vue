<script lang="ts" setup>
definePageMeta({
  layout: 'default',
  // Fully-authenticated users have no pending MFA flow — kick them to home.
  // Mid-MFA users have loggedIn=false (user not yet set in session) so they
  // can access the page.
  middleware: ['customer-accounts-enabled', 'guest'],
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('2fa-authenticate-totp', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
