<script lang="ts" setup>
const { t } = useI18n()

// The 'about' PageLayout drives which section(s) render here — for
// webside this resolves to the 'about_content' variant (today's exact
// markup, moved verbatim into
// app/components/PageSection/variants/webside/AboutContent.vue).
// No FALLBACK_LAYOUTS entry for 'about': a tenant without a published
// layout renders an empty page body.
const { layout, sections, error } = await usePageConfig('about')

// A page whose layout is not published must fail LOUDLY. Rendering an
// empty <main> with HTTP 200 is a soft-404: Google keeps it indexed, and
// the footer of any tenant that links here would advertise a blank page.
// Same normalization as app/pages/[slug].vue — a backend outage is 503,
// a genuinely absent layout is 404.
if (error.value || !layout.value?.isPublished) {
  const upstreamStatus = error.value?.statusCode ?? 404
  throw createError(
    upstreamStatus >= 500
      ? { statusCode: 503, message: t('error.service.unavailable') }
      : { statusCode: 404, message: t('error.page.not.found') },
  )
}

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <!-- PageWrapper is THE content frame (width + gutters) for every
       page; sections are width-agnostic and simply fill it. -->
  <PageWrapper>
    <PageBreadcrumb />
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
