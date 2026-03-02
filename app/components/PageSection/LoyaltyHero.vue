<script lang="ts" setup>
defineProps<{
  title?: string
}>()
</script>

<template>
  <div class="mx-auto max-w-(--container-main) md:!p-0">
    <LazyLoyaltyProgressHero />
  </div>
</template>
