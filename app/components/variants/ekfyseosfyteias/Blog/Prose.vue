<script lang="ts" setup>
import '~/assets/css/tenants/ekfyseosfyteias.css'

/**
 * The body of an activity, set in the co-op's own type: 19px on a
 * generous line, rounded photographs, and a quote drawn with the three
 * berry dots above it in the display face.
 *
 * The HTML is the editor's, so it is sanitised here (embedded video
 * kept, see `shared/utils/embeds.ts`) — and it is static, so the
 * component is meant to be hydrated never. Its own prose, not
 * `Blog/Article.vue`: that one paints with the platform's tokens, and
 * every colour here is one of the tenant's roles.
 */
const props = defineProps<{
  html: string
}>()

const { sanitize } = useHtmlContent()

const sanitizedHtml = computed(() => sanitize(props.html))
</script>

<template>
  <div
    class="fy-prose"
    v-html="sanitizedHtml"
  />
</template>

<style scoped>
.fy-prose {
  color: var(--fy-text);
  font-size: 1.1875rem;
  line-height: 1.75;
}

.fy-prose > :deep(* + *) {
  margin-block-start: 1.75rem;
}

.fy-prose > :deep(p:first-child) {
  font-size: 1.3125rem;
  line-height: 1.65;
}

.fy-prose :deep(h1),
.fy-prose :deep(h2),
.fy-prose :deep(h3),
.fy-prose :deep(h4) {
  font-family: var(--font-display);
  font-weight: 700;
  line-height: 1.15;
  scroll-margin-top: 7rem;
}

/* The page has its own h1: an editor's is a section heading here. */
.fy-prose :deep(h1),
.fy-prose :deep(h2) {
  font-size: 2rem;
  margin-block-start: 2.5rem;
}

.fy-prose :deep(h3) {
  font-size: 1.5rem;
}

.fy-prose :deep(h4) {
  font-size: 1.25rem;
}

.fy-prose :deep(a) {
  color: var(--fy-text);
  text-decoration: underline;
  text-underline-offset: 4px;
}

.fy-prose :deep(a:hover) {
  color: var(--fy-eyebrow);
}

.fy-prose :deep(a:focus-visible) {
  outline: 3px solid var(--fy-focus);
  outline-offset: 3px;
}

.fy-prose :deep(ul),
.fy-prose :deep(ol) {
  padding-inline-start: 1.5rem;
}

.fy-prose :deep(ul) {
  list-style: disc;
}

.fy-prose :deep(ol) {
  list-style: decimal;
}

.fy-prose :deep(li + li) {
  margin-block-start: 0.5rem;
}

.fy-prose :deep(img),
.fy-prose :deep(video) {
  border-radius: 1.5rem;
  display: block;
  height: auto;
  max-width: 100%;
}

/*
 * A run of photographs: two columns that keep every picture whole,
 * whatever its orientation (a phone's portraits beside a landscape).
 * The editor writes it as <div class="fy-gallery"> around the <img>s.
 */
.fy-prose :deep(.fy-gallery) {
  column-count: 2;
  column-gap: 0.75rem;
}

.fy-prose :deep(.fy-gallery img) {
  border-radius: 1rem;
  break-inside: avoid;
  margin-block-end: 0.75rem;
  width: 100%;
}

.fy-prose :deep(figure) {
  margin-inline: 0;
}

.fy-prose :deep(figcaption) {
  color: var(--fy-text-muted);
  font-size: 0.9375rem;
  line-height: 1.5;
  margin-block-start: 0.625rem;
}

.fy-prose :deep(iframe),
.fy-prose :deep(.rich-embed) {
  aspect-ratio: 16 / 9;
  border-radius: 1.5rem;
  height: auto;
  max-width: 100%;
  width: 100%;
}

/* A quote: three berries, then the words in the display face. */
.fy-prose :deep(blockquote) {
  font-family: var(--font-display);
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  font-style: italic;
  font-weight: 500;
  line-height: 1.22;
  margin-block: 2.5rem 0.5rem;
  margin-inline: 0;
  padding: 0;
}

.fy-prose :deep(blockquote)::before {
  background-color: var(--fy-accent);
  block-size: 0.6875rem;
  border-radius: 50%;
  box-shadow:
    1.1875rem 0 var(--fy-accent),
    2.375rem 0 var(--fy-accent);
  content: "";
  display: block;
  inline-size: 0.6875rem;
  margin-block-end: 1.125rem;
}

.fy-prose :deep(blockquote > p + p) {
  margin-block-start: 1rem;
}

.fy-prose :deep(table) {
  display: block;
  font-size: 1rem;
  overflow-x: auto;
}

.fy-prose :deep(th),
.fy-prose :deep(td) {
  border-bottom: 1.5px dashed var(--fy-rule);
  padding: 0.5rem 0.75rem;
  text-align: start;
}

.fy-prose :deep(hr) {
  border: 0;
  border-top: 1.5px dashed var(--fy-rule);
}
</style>
