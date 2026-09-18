<script lang="ts" setup>
definePageMeta({
  layout: 'default',
  // Only plain lowercase-kebab slugs; static routes (products, blog,
  // cart, checkout, account, search, api) always win route-matching
  // priority over this catch-all, but validate defensively too.
  validate: (route) => {
    const slug = 'slug' in route.params ? route.params.slug : undefined
    if (typeof slug !== 'string') return false
    const RESERVED_SLUGS = new Set(['api', 'account', 'products', 'blog', 'cart', 'checkout', 'search'])
    return /^[a-z0-9-]+$/.test(slug) && !RESERVED_SLUGS.has(slug)
  },
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('custom-page', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
