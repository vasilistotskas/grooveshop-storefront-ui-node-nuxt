<script lang="ts" setup>
// The 'about' PageLayout drives which section(s) render here — for
// webside this resolves to the 'about_content' variant (today's exact
// markup, moved verbatim into
// app/components/PageSection/variants/webside/AboutContent.vue).
// No FALLBACK_LAYOUTS entry for 'about': a tenant without a published
// layout renders an empty page body.
const { sections } = usePageConfig('about')

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
