<script lang="ts" setup>
/**
 * A search field as a band — for a page whose job is to send the
 * visitor into the catalogue.
 */
defineProps<{
  /** The operator's section title, from the section row itself. */
  title?: string
}>()
</script>

<template>
  <PageSectionBand
    :heading="title"
    padding="sm"
  >
    <!-- Measured, not centred: the band left-aligns its heading, so a
         centred field would sit away from the title above it. -->
    <div class="w-full max-w-2xl">
      <SearchInput />
    </div>
  </PageSectionBand>
</template>
