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
      'w-full',
      isMobileOrTablet ? 'py-0!' : 'md:p-0!',
    ]"
  />
</template>
