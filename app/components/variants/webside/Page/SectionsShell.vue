<script lang="ts" setup>
/**
 * webside's page-builder section shell — the markup AROUND the sections:
 * a `PageWrapper` with a gap between sections, each band a card on the
 * page. Extracted rather than written in each page because
 * `pages/index.vue` and `pages/[slug].vue` carried a byte-identical copy
 * of it.
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
  <WebsidePageWrapper>
    <slot name="title" />
    <section
      class="
        grid gap-4 pt-4
        md:flex md:flex-col md:gap-8
      "
    >
      <div
        class="
          grid gap-4
          md:gap-8
        "
      >
        <PageSectionRenderer
          v-for="section in sections"
          :key="section.uuid"
          :section="section"
        />
      </div>
      <slot name="after" />
    </section>
  </WebsidePageWrapper>
</template>
