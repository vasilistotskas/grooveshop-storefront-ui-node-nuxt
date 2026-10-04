<script lang="ts" setup>
/**
 * The body of a blog post, set as the article it is: the display face
 * on the headings, a comfortable measure, images and their captions
 * given room, a quote or call-out drawn as one.
 *
 * Its own prose, not `.article`: that class is the CMS pages' and the
 * frozen webside store's, and a change there reaches both. The rules
 * live here, scoped, and reach the editor's markup through `:deep`.
 *
 * The HTML is the editor's, so it is sanitised here (embedded video
 * kept, see `shared/utils/embeds.ts`) — and it is static, so the
 * component is meant to be hydrated never.
 */
const props = defineProps<{
  html: string
}>()

const sanitizedHtml = computed(() => sanitizeRichHtml(props.html))
</script>

<template>
  <div
    class="blog-article"
    v-html="sanitizedHtml"
  />
</template>

<style scoped>
.blog-article {
  color: var(--ui-text-toned);
  font-size: 1.0625rem;
  line-height: 1.75;
}

.blog-article :deep(p),
.blog-article :deep(ul),
.blog-article :deep(ol),
.blog-article :deep(blockquote),
.blog-article :deep(table),
.blog-article :deep(pre) {
  margin-block-end: 1.25rem;
}

.blog-article :deep(h2),
.blog-article :deep(h3) {
  color: var(--ui-text-highlighted);
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.15;
  /* The sticky header must not cover a heading a link jumped to. */
  scroll-margin-top: 7rem;
}

.blog-article :deep(h2) {
  font-size: 1.75rem;
  margin-top: 2.5rem;
}

.blog-article :deep(h3) {
  font-size: 1.375rem;
  margin-top: 2rem;
}

.blog-article :deep(strong) {
  color: var(--ui-text-highlighted);
}

.blog-article :deep(a) {
  color: var(--ui-text-highlighted);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.blog-article :deep(ul),
.blog-article :deep(ol) {
  padding-inline-start: 1.5rem;
}

.blog-article :deep(ul) {
  list-style: disc;
}

.blog-article :deep(ol) {
  list-style: decimal;
}

.blog-article :deep(li + li) {
  margin-top: 0.375rem;
}

.blog-article :deep(img),
.blog-article :deep(video) {
  border-radius: 0.875rem;
  height: auto;
  max-width: 100%;
}

.blog-article :deep(figure) {
  margin-block: 1.75rem;
}

.blog-article :deep(figcaption) {
  color: var(--ui-text-muted);
  font-size: 0.875rem;
  line-height: 1.4;
  margin-top: 0.5rem;
}

.blog-article :deep(iframe) {
  aspect-ratio: 16 / 9;
  border-radius: 0.875rem;
  height: auto;
  max-width: 100%;
  width: 100%;
}

.blog-article :deep(blockquote) {
  background: var(--ui-secondary-soft);
  border-radius: 0.875rem;
  color: var(--ui-text-highlighted);
  font-size: 0.9375rem;
  padding: 1rem 1.25rem;
}

.blog-article :deep(table) {
  display: block;
  font-size: 0.9375rem;
  overflow-x: auto;
}

.blog-article :deep(th),
.blog-article :deep(td) {
  border-bottom: 1px solid var(--ui-border);
  padding: 0.5rem 0.75rem;
  text-align: start;
}

.blog-article :deep(code) {
  background: var(--ui-bg-elevated);
  border-radius: 0.375rem;
  font-family: var(--font-mono);
  font-size: 0.9em;
  padding: 0.125rem 0.375rem;
}

.blog-article :deep(hr) {
  border-color: var(--ui-border);
  margin-block: 2rem;
}
</style>
