<script lang="ts" setup>
/**
 * One section of an open run (`WebsidePageBandRun`), telling it whether a band
 * of the run is right above it (`provideFollowsBand`). No element of its own.
 */
const props = defineProps<{ followsBand: boolean }>()

provideFollowsBand(props.followsBand)
</script>

<template>
  <slot />
</template>
