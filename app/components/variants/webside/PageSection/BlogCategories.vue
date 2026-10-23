<script lang="ts" setup>
defineProps<{
  title?: string
}>()

const blogEnabled = useStoreFeature('blog')
const { isMobileOrTablet } = useDevice()
</script>

<template>
  <WebsideBlogCategoriesSlider
    v-if="blogEnabled"
    :class="[
      'w-full',
      isMobileOrTablet ? 'py-0!' : 'md:p-0!',
    ]"
  />
</template>
