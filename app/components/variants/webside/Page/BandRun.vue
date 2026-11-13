<script lang="ts" setup>
/**
 * A run of sections that each draw their own full-width band, laid edge to
 * edge on the page's ground with no rule between them (`provideBandFlow`).
 * Each section learns whether a band of the run is right above it
 * (`WebsidePageBandRunItem`).
 */
defineProps<{ sections: BuilderSection[] }>()

provideBandFlow('open')
</script>

<template>
  <div class="grid grid-cols-1">
    <WebsidePageBandRunItem
      v-for="(section, index) in sections"
      :key="section.id"
      :follows-band="index > 0"
    >
      <PageSectionRenderer :section="section" />
    </WebsidePageBandRunItem>
  </div>
</template>
