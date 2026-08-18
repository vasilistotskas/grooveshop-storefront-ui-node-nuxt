<script lang="ts" setup>
// The 'vision' PageLayout drives which section(s) render here — for
// webside this resolves to the 'vision_content' variant (today's exact
// markup, moved verbatim into
// app/components/PageSection/variants/webside/VisionContent.vue).
// No FALLBACK_LAYOUTS entry for 'vision': a tenant without a published
// layout renders an empty page body.
const { sections } = usePageConfig('vision')

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
