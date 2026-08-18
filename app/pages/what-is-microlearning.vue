<script lang="ts" setup>
// The 'what-is-microlearning' PageLayout drives which section(s) render
// here — for webside this resolves to the 'what_is_microlearning'
// variant (today's exact markup, moved verbatim into
// app/components/PageSection/variants/webside/WhatIsMicrolearning.vue).
// No FALLBACK_LAYOUTS entry: a tenant without a published layout
// renders an empty page body.
const { sections } = usePageConfig('what-is-microlearning')

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
