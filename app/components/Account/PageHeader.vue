<script lang="ts" setup>
/**
 * An account page's heading: its one `<h1>` in the display face, a line
 * under it (`lead`, or the `lead` slot when it holds markup such as a
 * date), and the page's own actions beside it (they wrap under it on a
 * phone).
 */
defineProps<{
  title: string
  lead?: string
}>()

defineSlots<{
  lead?(props: object): any
  actions?(props: object): any
}>()
</script>

<template>
  <header class="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
    <div class="flex min-w-0 flex-col gap-2">
      <h1
        class="
          font-display text-[1.875rem]/[1.1] font-bold tracking-[-0.02em]
          text-highlighted
          lg:text-[2.25rem]/[1.1]
        "
      >
        {{ title }}
      </h1>
      <p
        v-if="lead || $slots.lead"
        class="text-toned"
      >
        <slot name="lead">
          {{ lead }}
        </slot>
      </p>
    </div>
    <div
      v-if="$slots.actions"
      class="flex flex-wrap items-center gap-2"
    >
      <slot name="actions" />
    </div>
  </header>
</template>
