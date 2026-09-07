<script lang="ts" setup>
/**
 * "Πώς συνδέεται" — where the system sits in a chain, as numbered
 * steps with a connector between them.
 *
 * Measured off the artboard at 1440px: a 30px heading, a 16px/1.7
 * body, then equal cards on a `#0F172A` ground with the MIDDLE one
 * bordered in teal — it is the thing the page is about, and the
 * artboard says so by outlining it. Each card carries a monospace
 * ordinal label, a 17px title and its lines in monospace 13px/1.75.
 *
 * The connectors are `aria-hidden` and only drawn from `lg`: below
 * that the steps stack, where an arrow pointing right would be
 * describing a layout that no longer exists. Reading order carries
 * the sequence instead, which is what the ordinals are for.
 *
 * The highlighted step is the MIDDLE one by position rather than a
 * prop: a flow with a highlight has it in the middle by definition —
 * the thing being explained sits between what feeds it and what
 * consumes it — and an index prop would be one more thing for a
 * layout to get wrong.
 */
const props = defineProps<{
  heading?: string
  body?: string
  items?: { title: string, label?: string, lines?: string[] }[]
}>()

const middle = computed(() =>
  (props.items?.length ?? 0) === 3 ? 1 : -1,
)
</script>

<template>
  <section
    v-if="items?.length"
    class="
      border-b border-default bg-muted px-5 py-16
      lg:px-20 lg:py-24
    "
  >
    <div class="mx-auto max-w-[1280px]">
      <h2
        v-if="heading"
        class="
          text-[24px] leading-[1.15] font-bold tracking-[-0.02em]
          text-highlighted
          lg:text-[30px]
        "
      >
        {{ heading }}
      </h2>
      <p
        v-if="body"
        class="mt-5 max-w-[640px] text-[16px] leading-[1.7] text-muted"
      >
        {{ body }}
      </p>

      <ol
        class="
          mt-11 flex flex-col gap-4
          lg:flex-row lg:items-stretch lg:gap-0
        "
      >
        <template
          v-for="(item, index) in items"
          :key="item.title"
        >
          <li
            v-if="index > 0"
            aria-hidden="true"
            class="
              hidden shrink-0 items-center justify-center px-5
              lg:flex
            "
          >
            <UIcon
              :name="index === middle + 1
                ? 'i-lucide:arrow-left-right'
                : 'i-lucide:arrow-right'"
              class="size-5 text-dimmed"
            />
          </li>
          <li
            class="flex-1 rounded-xl border bg-default p-6"
            :class="index === middle
              ? 'border-primary'
              : 'border-default'"
          >
            <p
              v-if="item.label"
              class="
                font-mono text-[10.5px] tracking-[0.14em] uppercase
              "
              :class="index === middle ? 'text-primary' : 'text-dimmed'"
            >
              {{ item.label }}
            </p>
            <p
              class="mt-3.5 text-[17px] font-semibold text-highlighted"
            >
              {{ item.title }}
            </p>
            <ul
              v-if="item.lines?.length"
              class="mt-5 flex flex-col gap-2"
            >
              <li
                v-for="line in item.lines"
                :key="line"
                class="font-mono text-[13px] leading-[1.75] text-muted"
              >
                {{ line }}
              </li>
            </ul>
          </li>
        </template>
      </ol>
    </div>
  </section>
</template>
