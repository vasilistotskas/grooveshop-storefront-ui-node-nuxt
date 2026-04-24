<script lang="ts" setup>
import DOMPurify from 'isomorphic-dompurify'

/**
 * BlogContent - A wrapper component for blog post HTML content
 *
 * This component is designed to be used with lazy hydration strategies
 * (hydrate-never, hydrate-on-visible) since blog content is static HTML
 * that doesn't require client-side interactivity.
 *
 * @example
 * ```vue
 * <LazyBlogContent hydrate-never :html="transformedHtml" />
 * ```
 */
const props = defineProps<{
  /** The transformed HTML content to render */
  html: string
}>()

const sanitizedHtml = computed(() => DOMPurify.sanitize(props.html))
</script>

<template>
  <div
    class="article"
    v-html="sanitizedHtml"
  />
</template>
