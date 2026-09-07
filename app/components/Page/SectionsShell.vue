<script lang="ts" setup>
/**
 * The page-builder's section shell — the markup AROUND the sections.
 *
 * The platform's shell is a `UContainer` with a gap between sections:
 * right for a shop, where each band is a card on the page. A design
 * whose bands each own the full width, their own background and a 1px
 * rule against the next one needs the opposite — no container, no
 * gutter, no gap — or every band renders as an inset card floating in
 * white space, which is most of what made the Δelta Σigma redesign
 * read as nothing like its artboards.
 *
 * Which shell a tenant gets is `hasFullBleedBands`. Extracted here
 * rather than branched in each page because `pages/index.vue` and
 * `pages/[slug].vue` carried a byte-identical copy of the platform
 * markup, so the choice had to be made twice to be made at all.
 */
defineProps<{ sections: PageSection[] }>()

defineSlots<{
  /** The page's h1, which is a page concern, not a section's. */
  title?: (props: object) => unknown
}>()

const tenantStore = useTenantStore()
const fullBleed = computed(() => hasFullBleedBands(tenantStore.schemaName))
</script>

<template>
  <div v-if="fullBleed">
    <slot name="title" />
    <PageSectionRenderer
      v-for="section in sections"
      :key="section.uuid"
      :section="section"
    />
  </div>
  <PageWrapper v-else>
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
    </section>
  </PageWrapper>
</template>
