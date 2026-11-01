<script lang="ts" setup>
// The page editor's shell: staff only, rendered in the browser, and never
// part of the cached storefront. No route rule gives it a cache (the SSR
// cache holds anonymous renders), so every request gets its own nonce CSP
// and `private, no-store`; `robots: false` keeps it out of indexes and
// the sitemap.
definePageMeta({ layout: 'builder' })
defineRouteRules({
  robots: false,
})
</script>

<template>
  <ClientOnly>
    <BuilderShell />
  </ClientOnly>
</template>
