<script lang="ts" setup>
/**
 * Admin-authored prose, on a band of its own.
 *
 * The HTML is sanitised before it reaches the DOM. It is the `rich_text`
 * CMS section, so it is authored by a store operator rather than a
 * shopper — but "authored by an operator" is not "safe to inject": a
 * compromised or careless staff account, or any future path that lets
 * less-trusted input reach a page section, would land straight in the
 * DOM. Sanitising here also gives CMS sections video embeds on the same
 * terms as blog posts.
 */
const props = defineProps<{
  /** The operator's section title, from the section row itself. */
  title?: string
  content?: string
  surface?: 'default' | 'muted'
}>()

const sanitizedContent = computed(() => sanitizeRichHtml(props.content))
</script>

<template>
  <PageSectionBand
    v-if="sanitizedContent"
    :heading="title"
    :surface="surface"
  >
    <div
      class="article prose max-w-none dark:prose-invert"
      v-html="sanitizedContent"
    />
  </PageSectionBand>
</template>
