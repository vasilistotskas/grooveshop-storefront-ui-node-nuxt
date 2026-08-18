<script lang="ts" setup>
// The 'why-microlearning' PageLayout drives which section(s) render
// here — for webside this resolves to the 'why_microlearning' variant
// (today's exact markup, moved verbatim into
// app/components/PageSection/variants/webside/WhyMicrolearning.vue).
// No FALLBACK_LAYOUTS entry: a tenant without a published layout
// renders an empty page body.
const { sections } = usePageConfig('why-microlearning')

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageSectionRenderer
    v-for="section in sections"
    :key="section.uuid"
    :section="section"
  />
</template>
