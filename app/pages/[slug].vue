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
const { layout, sections, error } = await usePageConfig(slug)

if (error.value || !layout.value?.isPublished) {
  // Distinguish "row really absent" (404) from "backend unavailable"
  // (5xx / timeout) — same normalization as products/[id]/[slug].vue
  // and blog/post/[id]/[slug].vue.
  const upstreamStatus = error.value?.statusCode ?? 404
  throw createError(
    upstreamStatus >= 500
      ? { statusCode: 503, message: t('error.service.unavailable') }
      : { statusCode: 404, message: t('error.page.not.found') },
  )
}

// The heading of the section that owns the page's h1, which is both
// what a reader sees at the top of it and the only title source here
// that is LOCALISED — `PageLayout.title` is the admin's label for the
// layout and is not translatable, so it served "Μητρώο έργων" on
// `/en/empeiria` and "Eidikefsi" (the slug, title-cased) on the pages
// whose layout predates its own naming. It stays as the fallback.
const pageTitle = computed(
  () => sectionsHeadingText(sections.value) ?? layout.value?.title,
)

useSeoMeta({
  title: () => pageTitle.value,
})
useHead({
  title: () => pageTitle.value,
})

definePageMeta({
  layout: 'default',
  // Only plain lowercase-kebab slugs; static routes (products, blog,
  // cart, checkout, account, search, api) always win route-matching
  // priority over this catch-all, but validate defensively too.
  validate: (route) => {
    const slug = 'slug' in route.params ? route.params.slug : undefined
    if (typeof slug !== 'string') return false
    const RESERVED_SLUGS = new Set(['api', 'account', 'products', 'blog', 'cart', 'checkout', 'search'])
    return /^[a-z0-9-]+$/.test(slug) && !RESERVED_SLUGS.has(slug)
  },
})
</script>

<template>
  <PageSectionsShell :sections="sections" />
</template>
