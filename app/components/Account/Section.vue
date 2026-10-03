<script lang="ts" setup>
/**
 * One section of an account page, as the boards draw them: a card with
 * its heading, a line saying what it is for, its own action beside the
 * heading (under it on a phone, as wide as the card), then its content.
 *
 * The heading is an `<h2>` labelling the section, so a screen reader's
 * landmark list names each one. A link that jumps to a section (its `id`)
 * stops it clear of the sticky header.
 */
const props = defineProps<{
  title: string
  description?: string
}>()

defineSlots<{
  actions?(props: object): any
  default?(props: object): any
}>()

const headingId = useId()
</script>

<template>
  <section
    :aria-labelledby="headingId"
    class="flex scroll-mt-24 flex-col gap-5 rounded-[1.25rem] bg-default p-5 ring ring-default sm:p-6"
  >
    <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <div class="flex min-w-0 flex-col gap-1">
        <h2
          :id="headingId"
          class="font-semibold text-highlighted"
        >
          {{ props.title }}
        </h2>
        <p
          v-if="props.description"
          class="text-sm text-toned"
        >
          {{ props.description }}
        </p>
      </div>
      <div
        v-if="$slots.actions"
        class="
          flex flex-wrap items-center gap-2
          max-sm:w-full max-sm:*:flex-1 max-sm:*:justify-center
        "
      >
        <slot name="actions" />
      </div>
    </div>
    <slot />
  </section>
</template>
