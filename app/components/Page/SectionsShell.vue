<script lang="ts" setup>
/**
 * The page-builder's section shell — the markup AROUND the sections.
 *
 * There is none. A page built from sections is a stack of full-width
 * BANDS, and each section carries its own (`PageSection/Band.vue`):
 * its ground, its padding and the container that holds its measure.
 * Wrapping the stack in a container instead would make every band an
 * inset card floating in white space, and would stop any of them from
 * ever painting edge to edge.
 *
 * webside keeps the previous shell — a `PageWrapper` with a gap between
 * sections — in its frozen copy of this file, because its sections are
 * cards on a page rather than bands.
 */
defineProps<{ sections: PageSection[] }>()

defineSlots<{
  /** The page's h1, which is a page concern, not a section's. */
  title?: (props: object) => unknown
  /** What the page carries UNDER its sections — `/contact`'s form. */
  after?: (props: object) => unknown
}>()
</script>

<template>
  <div>
    <slot name="title" />
    <PageSectionRenderer
      v-for="section in sections"
      :key="section.uuid"
      :section="section"
    />
    <slot name="after" />
  </div>
</template>
