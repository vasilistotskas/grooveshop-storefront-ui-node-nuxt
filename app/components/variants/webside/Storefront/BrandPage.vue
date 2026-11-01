<script lang="ts" setup>
/**
 * A brand page: a route whose whole body is its published builder page
 * (`about`, `vision`, `what-is-microlearning`, `why-microlearning`).
 *
 * One component for the four routes, because they differed only in the
 * page type they asked for. A store that has not built one gets a 404,
 * not an empty page.
 */
const props = defineProps<{
  pageType: string
}>()

const { t } = useI18n()

const { page, sections, error } = await useBuilderPage(props.pageType)

// A page that is not published must fail LOUDLY. Rendering an
// empty <main> with HTTP 200 is a soft-404: Google keeps it indexed, and
// the footer of any tenant that links here would advertise a blank page.
// Same normalization as the custom [slug] page — a backend outage is
// 503, a genuinely absent page is 404.
if (error.value || !page.value) {
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
  <WebsidePageWrapper>
    <WebsidePageBreadcrumb />
    <div
      class="
        grid gap-6
        md:gap-10
      "
    >
      <PageSectionRenderer
        v-for="section in sections"
        :key="section.id"
        :section="section"
      />
    </div>
  </WebsidePageWrapper>
</template>
