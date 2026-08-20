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
const { data, sections, error } = await usePageConfig(slug)

if (error.value || !data.value?.isPublished) {
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

// PageLayout.title is the admin display name for the layout — used as
// the SEO title fallback here since a custom builder page has no other
// title source (unlike the static pages, which own dedicated i18n
// titles inside their section variants).
useSeoMeta({
  title: () => data.value?.title,
})
useHead({
  title: () => data.value?.title,
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
  <PageWrapper>
    <section
      class="
        grid gap-4 pt-4
        md:flex md:flex-col md:gap-8
      "
    >
      <div
        class="
          grid gap-4
          md:gap-8
        "
      >
        <PageSectionRenderer
          v-for="section in sections"
          :key="section.uuid"
          :section="section"
        />
      </div>
    </section>
  </PageWrapper>
</template>
