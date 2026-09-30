<script lang="ts" setup>
definePageMeta({
  layout: 'default',
  // Only plain lowercase-kebab slugs; static routes (products, blog,
  // cart, checkout, account, search, api) always win route-matching
  // priority over this catch-all, but validate defensively too.
  validate: route => isCustomPageSlug('slug' in route.params ? route.params.slug : undefined),
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('custom-page', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
