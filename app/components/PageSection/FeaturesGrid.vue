<script lang="ts" setup>
const props = defineProps<{
  title?: string
  heading?: string
  items?: Array<{ title: string, text?: string, icon?: string }>
  columns?: number
  decor?: 'none' | 'gradient_tiles'
}>()

// Static class map so Tailwind sees every variant at build time.
const COLUMN_CLASSES: Record<number, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
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
    <h2
      v-if="heading"
      class="
        font-display mb-6 text-2xl font-bold text-balance
        md:text-3xl
      "
    >
      {{ heading }}
    </h2>
    <div
      class="
        grid grid-cols-1 gap-5
        sm:grid-cols-2
      "
      :class="columnsClass"
    >
      <div
        v-for="(item, idx) in items"
        :key="idx"
        class="
          rounded-lg border border-primary-200 bg-white p-6
          dark:border-primary-800 dark:bg-primary-900
        "
      >
        <div
          v-if="item.icon"
          class="mb-4 flex size-12 items-center justify-center rounded-lg"
          :class="
            decor === 'gradient_tiles'
              ? `
                bg-linear-135 from-(--ui-color-primary-500)
                via-(--ui-color-secondary-500) to-(--ui-secondary)
                text-white shadow-lg
              `
              : `
                bg-primary-100 text-primary-700
                dark:bg-primary-800 dark:text-primary-200
              `
          "
        >
          <UIcon
            :name="item.icon"
            class="size-6"
          />
        </div>
        <h3 class="font-display mb-1 text-lg font-semibold">
          {{ item.title }}
        </h3>
        <p
          v-if="item.text"
          class="
            text-sm text-primary-700
            dark:text-primary-300
          "
        >
          {{ item.text }}
        </p>
      </div>
    </div>
  </div>
</template>
