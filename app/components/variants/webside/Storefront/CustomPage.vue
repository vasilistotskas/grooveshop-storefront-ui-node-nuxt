<script lang="ts" setup>
const { t } = useI18n()
const route = useRoute()

const slug = 'slug' in route.params ? route.params.slug : ''

if (!slug) {
  throw createError({
    statusCode: 404,
    message: t('error.page.not.found'),
  })
}

// The `await` is what makes the checks below meaningful: Nuxt hands
// useFetch's promise to onServerPrefetch and lets setup run on, so
// WITHOUT it data/error are still null here on every server render and
// the 404 branch fires unconditionally. Awaiting suspends setup, same
// as every other data-driven page in app/pages/**.
const { page, sections, error } = await useBuilderPage(slug)

if (error.value || !page.value) {
  // Distinguish "page really absent" (404) from "backend unavailable"
  // (5xx / timeout) — same normalization as products/[id]/[slug].vue
  // and blog/post/[id]/[slug].vue.
  const upstreamStatus = error.value?.statusCode ?? 404
  throw createError(
    upstreamStatus >= 500
      ? { statusCode: 503, message: t('error.service.unavailable') }
      : { statusCode: 404, message: t('error.page.not.found') },
  )
}

// The heading of the section that owns the page's h1, which is both what a
// reader sees at the top of it and a title that is LOCALISED. The page's own
// `seoTitle`, when the operator set one, beats it (`useBuilderPage` emits it
// at high priority); a page with neither keeps the store's default title.
const pageTitle = computed(() => sectionsHeadingText(sections.value))

useSeoMeta({
  title: () => pageTitle.value,
})
useHead({
  title: () => pageTitle.value,
})
</script>

<template>
  <WebsidePageSectionsShell :sections="sections" />
</template>
