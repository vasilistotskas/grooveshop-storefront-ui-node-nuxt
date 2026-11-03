<script lang="ts" setup>
/**
 * webside's page-builder section shell — the markup AROUND the sections:
 * a `PageWrapper` with a gap between sections, each band a card on the
 * page. Extracted rather than written in each page because
 * `pages/index.vue` and `pages/[slug].vue` carried a byte-identical copy
 * of it.
 *
 * Both grids below `md` have ONE column that may shrink (`grid-cols-1` is
 * `minmax(0, 1fr)`): an `auto` column is as wide as the widest section's
 * min-content, and a section that scrolls a rail sideways (the blog posts, a
 * product slider) reports the rail's whole width as its min-content, so the
 * page scrolled sideways on a phone.
 */
defineProps<{ sections: BuilderSection[] }>()

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
        grid grid-cols-1 gap-4 pt-4
        md:flex md:flex-col md:gap-8
      "
    >
      <div
        class="
          grid grid-cols-1 gap-4
          md:gap-8
        "
      >
        <PageSectionRenderer
          v-for="section in sections"
          :key="section.id"
          :section="section"
        />
      </div>
      <slot name="after" />
    </section>
  </WebsidePageWrapper>
</template>
