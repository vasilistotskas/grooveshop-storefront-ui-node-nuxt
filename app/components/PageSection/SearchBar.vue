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
    <div class="mx-auto w-full max-w-2xl">
      <SearchInput />
    </div>
  </PageSectionBand>
</template>
