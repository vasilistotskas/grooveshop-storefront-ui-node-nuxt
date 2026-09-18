<script lang="ts" setup>
/**
 * Photographs, with captions where the operator wrote one.
 */
const props = withDefaults(defineProps<{
  /** The operator's section title, from the section row itself. */
  title?: string
  items?: Array<{ src: string, alt: string, caption?: string }>
  columns?: number
  surface?: 'default' | 'muted'
}>(), {
  columns: 3,
})

// Static class map so Tailwind sees every variant at build time.
const COLUMN_CLASSES: Record<number, string> = {
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
}

const columnsClass = computed(
  () => COLUMN_CLASSES[props.columns] ?? COLUMN_CLASSES[3],
)
</script>

<template>
  <PageSectionBand
    v-if="items?.length"
    :heading="title"
    :surface="surface"
  >
    <div
      class="grid grid-cols-2 gap-4"
      :class="columnsClass"
    >
      <figure
        v-for="(item, idx) in items"
        :key="idx"
        class="m-0"
      >
        <ImgWithFallback
          :src="item.src"
          :alt="item.alt"
          :width="600"
          :height="600"
          class="aspect-square w-full rounded-xl bg-elevated object-cover"
          fit="cover"
          quality="80"
          loading="lazy"
        />
        <figcaption
          v-if="item.caption"
          class="mt-2 text-sm text-muted"
        >
          {{ item.caption }}
        </figcaption>
      </figure>
    </div>
  </PageSectionBand>
</template>
