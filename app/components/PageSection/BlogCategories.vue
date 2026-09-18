<script lang="ts" setup>
/**
 * The blog's categories as a rail. Nothing is fetched when the tenant's
 * blog is off — the REQUEST is what the flag gates, not just the
 * render.
 */
defineProps<{
  /** The operator's section title, from the section row itself. */
  title?: string
}>()

const tenantStore = useTenantStore()
</script>

<template>
  <PageSectionBand
    v-if="tenantStore.blogEnabled"
    :heading="title"
    padding="sm"
  >
    <BlogCategoriesSlider class="w-full p-0!" />
  </PageSectionBand>
</template>
