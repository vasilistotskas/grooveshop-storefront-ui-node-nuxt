<script lang="ts" setup>
/**
 * One section of webside's Security page: a card whose header carries
 * the section's icon in a tinted circle, its heading (an `<h2>` the
 * section is labelled by, so a screen reader's landmark list names each
 * one), a line saying what it is for, and its own action beside them.
 * A link that jumps to a section (its `id`) stops it clear of the sticky
 * header.
 */
defineProps<{
  title: string
  icon: string
  description?: string
}>()

defineSlots<{
  actions?(props: object): any
  default?(props: object): any
}>()

const headingId = useId()
</script>

<template>
  <UCard
    as="section"
    :aria-labelledby="headingId"
    class="scroll-mt-24"
  >
    <template #header>
      <div
        class="
          flex flex-wrap items-start justify-between gap-x-4 gap-y-3
        "
      >
        <div class="flex min-w-0 items-center gap-3">
          <div
            class="
              flex size-10 min-w-10 items-center justify-center rounded-full
              bg-primary/10
            "
          >
            <UIcon
              :name="icon"
              class="size-5 text-primary"
            />
          </div>
          <div class="min-w-0">
            <h2
              :id="headingId"
              class="
                text-lg font-semibold text-gray-900
                md:text-xl
                dark:text-white
              "
            >
              {{ title }}
            </h2>
            <p
              v-if="description"
              class="
                mt-1 text-sm text-gray-500
                dark:text-gray-200
              "
            >
              {{ description }}
            </p>
          </div>
        </div>
        <div
          v-if="$slots.actions"
          class="flex flex-wrap items-center gap-2"
        >
          <slot name="actions" />
        </div>
      </div>
    </template>

    <!-- No default slot, no body: UCard draws its padded body (and the
         rule above it) whenever the slot exists. -->
    <template
      v-if="$slots.default"
      #default
    >
      <div class="space-y-4">
        <slot />
      </div>
    </template>
  </UCard>
</template>
