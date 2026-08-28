<script lang="ts" setup>
const props = defineProps<{
  title?: string
  items?: Array<{ src: string, alt: string, caption?: string }>
  columns?: number
}>()

// Static class map so Tailwind sees every variant at build time.
const COLUMN_CLASSES: Record<number, string> = {
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
}

const columnsClass = computed(
  () => COLUMN_CLASSES[props.columns ?? 3] ?? COLUMN_CLASSES[3],
)
</script>

<template>
  <div
    v-if="items?.length"
    class="mx-auto max-w-(--container-main) md:!p-0"
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
          class="aspect-square w-full rounded-lg object-cover"
          fit="cover"
          quality="80"
        />
        <figcaption
          v-if="item.caption"
          class="
            mt-1.5 text-sm text-primary-600
            dark:text-primary-400
          "
        >
          {{ item.caption }}
        </figcaption>
      </figure>
    </div>
  </div>
</template>
