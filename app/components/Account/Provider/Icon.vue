<script lang="ts" setup>
/**
 * A social provider's brand mark. Drawn as inline SVG rather than a CSS
 * background: Google's "G" is multicolour artwork with a conic gradient in a
 * `foreignObject`, which WebKit does not paint in a background image.
 */
defineProps<{
  providerId: string
}>()
</script>

<template>
  <UIcon
    :name="socialProviderIcon(providerId)"
    mode="svg"
  />
</template>
