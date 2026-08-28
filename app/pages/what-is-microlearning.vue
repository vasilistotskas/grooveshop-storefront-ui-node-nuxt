<script lang="ts" setup>
const { t } = useI18n()

// The 'what-is-microlearning' PageLayout drives which section(s) render
// here — for webside this resolves to the 'what_is_microlearning'
// variant (today's exact markup, moved verbatim into
// app/components/PageSection/variants/webside/WhatIsMicrolearning.vue).
// No FALLBACK_LAYOUTS entry: a tenant without a published layout
// renders an empty page body.
const { data, sections, error } = await usePageConfig('what-is-microlearning')

// A page whose layout is not published must fail LOUDLY. Rendering an
// empty <main> with HTTP 200 is a soft-404: Google keeps it indexed, and
// the footer of any tenant that links here would advertise a blank page.
// Same normalization as app/pages/[slug].vue — a backend outage is 503,
// a genuinely absent layout is 404.
if (error.value || !data.value?.isPublished) {
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
  <!-- Vertical rhythm between sections (single-section layouts render
       identically — a one-item grid has no gaps). No UContainer here:
       full-bleed section variants own their width. -->
  <div
    class="
      grid gap-6 pb-8
      md:gap-10 md:pb-12
    "
  >
    <PageSectionRenderer
      v-for="section in sections"
      :key="section.uuid"
      :section="section"
    />
  </div>
</template>
