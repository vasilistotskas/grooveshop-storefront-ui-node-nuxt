<script lang="ts" setup>
defineProps<{
  title?: string
}>()

const tenantStore = useTenantStore()
const { isMobileOrTablet } = useDevice()
</script>

<template>
  <BlogCategoriesSlider
    v-if="tenantStore.blogEnabled"
    :class="[
      'mx-auto max-w-main',
      isMobileOrTablet ? 'py-0!' : 'md:p-0!',
    ]"
  />
</template>
