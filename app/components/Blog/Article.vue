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
/* The boards' sizes: 17px body and a 19px lead on a phone, 19px and 22px
   from the desktop breakpoint, section headings 26px then 32px. */
.blog-article {
  color: var(--ui-text-toned);
  font-size: 1.0625rem;
  line-height: 1.7;
}

/* The opening paragraph is the post's lead. */
.blog-article > :deep(p:first-child) {
  color: var(--ui-text-highlighted);
  font-size: 1.1875rem;
  line-height: 1.55;
}

.blog-article :deep(p),
.blog-article :deep(ul),
.blog-article :deep(ol),
.blog-article :deep(blockquote),
.blog-article :deep(table),
.blog-article :deep(pre) {
  margin-block-end: 1.25rem;
}

/* An editor's h1 is a section heading here: the page has its own. */
.blog-article :deep(h1),
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

.blog-article :deep(h1),
.blog-article :deep(h2) {
  font-size: 1.625rem;
  margin-top: 2.5rem;
}

/* Tailwind's preflight leaves h4–h6 at body size and weight; give them
   the steps below h3 so an editor's sub-headings still read as such. */
.blog-article :deep(h4),
.blog-article :deep(h5),
.blog-article :deep(h6) {
  color: var(--ui-text-highlighted);
  font-weight: 700;
  line-height: 1.3;
  margin-top: 1.75rem;
  scroll-margin-top: 7rem;
}

.blog-article :deep(h4) {
  font-size: 1.1875rem;
}

.blog-article :deep(h5) {
  font-size: 1.0625rem;
}

.blog-article :deep(h6) {
  font-size: 1rem;
}

/* FAQ items from the editor's accordion plugin: <details
   class="mce-accordion"> with a <summary> question and the answer as its
   other children (the editing wrapper is dropped on save). Native
   <details>, so it opens with no JavaScript in a body that is never
   hydrated. Drawn like the redesign's FAQ rows (Storefront/
   LoyaltyProgram): a rule between items, the question bold, a chevron
   that turns. `.article` keeps its own look for the CMS pages and
   webside. */
.blog-article :deep(details.mce-accordion) {
  border-top: 1px solid var(--ui-border);
  margin-block-end: 0;
}

.blog-article :deep(details.mce-accordion:last-of-type) {
  border-bottom: 1px solid var(--ui-border);
  margin-block-end: 1.25rem;
}

.blog-article :deep(details.mce-accordion > summary) {
  align-items: center;
  color: var(--ui-text-highlighted);
  cursor: pointer;
  display: flex;
  font-weight: 700;
  gap: 0.75rem;
  list-style: none;
  padding-block: 1.125rem;
}

.blog-article :deep(details.mce-accordion > summary::-webkit-details-marker) {
  display: none;
}

.blog-article :deep(details.mce-accordion > summary::after) {
  background-color: currentcolor;
  block-size: 1rem;
  content: "";
  flex-shrink: 0;
  inline-size: 1rem;
  margin-inline-start: auto;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") center / contain no-repeat;
  transition: rotate 200ms ease-out;
}

.blog-article :deep(details.mce-accordion[open] > summary::after) {
  rotate: 180deg;
}

.blog-article :deep(details.mce-accordion[open]) {
  padding-block-end: 1rem;
}

@media (prefers-reduced-motion: reduce) {
  .blog-article :deep(details.mce-accordion > summary::after) {
    transition: none;
  }
}

@media (min-width: 64rem) {
  .blog-article {
    font-size: 1.1875rem;
  }

  .blog-article > :deep(p:first-child) {
    font-size: 1.375rem;
  }

  .blog-article :deep(h1),
  .blog-article :deep(h2) {
    font-size: 2rem;
  }
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
