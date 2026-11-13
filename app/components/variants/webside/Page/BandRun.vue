<script lang="ts" setup>
/**
 * A run of sections that each draw their own full-width band, laid edge to
 * edge on the page's ground with no rule between them (`provideBandFlow`).
 */
defineProps<{ sections: BuilderSection[] }>()

provideBandFlow('open')
</script>

<template>
  <div class="grid grid-cols-1">
    <PageSectionRenderer
      v-for="section in sections"
      :key="section.id"
      :section="section"
    />
  </div>
</template>
