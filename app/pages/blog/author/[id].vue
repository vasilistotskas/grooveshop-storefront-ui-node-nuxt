<script lang="ts" setup>
definePageMeta({
  // Its query (sort, filters, page, search) is the view a sign-in brings back to.
  signInReturn: 'path-and-query',
  layout: 'default',
  middleware: ['blog-enabled'],
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('blog-author', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
