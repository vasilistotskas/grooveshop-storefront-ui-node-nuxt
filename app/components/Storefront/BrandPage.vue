<script lang="ts" setup>
/**
 * A brand page: a route whose whole body is its published PageLayout
 * (`about`, `vision`, `what-is-microlearning`, `why-microlearning`).
 *
 * One component for the four routes, because they differed only in the
 * pageType they asked for. There is no FALLBACK_LAYOUTS entry for any of
 * them: a tenant without a published layout gets a 404, not an empty
 * page.
 */
const props = defineProps<{
  pageType: string
}>()

const { t, te } = useI18n()

const { layout, sections, error } = await usePageConfig(props.pageType)

/**
 * The page's own heading and document title.
 *
 * This body rendered its published sections and NOTHING else: no `<h1>`
 * and no `useSeoMeta`, so `/about` shipped zero headings and a `<title>`
 * that was the store name twice. `PageLayout.title` is not the answer —
 * it is the ADMIN display name ("About"), which would print English on
 * a Greek page.
 *
 * So: the operator's `seoTitle` when they set one, else a translated
 * title for the page type. The `<h1>` is stood down when a section
 * already provides the page heading, the same rule the contact page
 * uses — two `<h1>`s is its own defect.
 */
const fallbackKey = computed(() => `page.${props.pageType}`)
const pageTitle = computed(
  () => layout.value?.seoTitle
    || (te(fallbackKey.value) ? t(fallbackKey.value) : ''),
)
const showTitle = computed(
  () => Boolean(pageTitle.value) && !sectionsProvideHeading(sections.value),
)

useSeoMeta({
  title: () => pageTitle.value || undefined,
  description: () => layout.value?.seoDescription || undefined,
})

// A page whose layout is not published must fail LOUDLY. Rendering an
// empty <main> with HTTP 200 is a soft-404: Google keeps it indexed, and
// the footer of any tenant that links here would advertise a blank page.
// Same normalization as the custom [slug] page — a backend outage is
// 503, a genuinely absent layout is 404.
if (error.value || !layout.value?.isPublished) {
  const upstreamStatus = error.value?.statusCode ?? 404
  throw createError(
    upstreamStatus >= 500
      ? { statusCode: 503, message: t('error.service.unavailable') }
      : { statusCode: 404, message: t('error.page.not.found') },
  )
}
</script>

<template>
  <!-- PageWrapper is THE content frame (width + gutters) for every
       page; sections are width-agnostic and simply fill it. -->
  <PageWrapper>
    <PageBreadcrumb />
    <PageTitle
      v-if="showTitle"
      :text="pageTitle"
      class="mb-4"
    />
    <div
      class="
        grid gap-6
        md:gap-10
      "
    >
      <PageSectionRenderer
        v-for="section in sections"
        :key="section.uuid"
        :section="section"
      />
    </div>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  page:
    about: Σχετικά με εμάς
en:
  page:
    about: About us
</i18n>
