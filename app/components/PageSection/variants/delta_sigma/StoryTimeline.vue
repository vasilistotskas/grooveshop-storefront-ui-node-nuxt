<script lang="ts" setup>
/**
 * Δelta Σigma's Δραστηριότητες band — the eight phases of a job.
 *
 * Not a timeline, whatever the section type is called: the artboard
 * lays the phases out as a four-across bordered GRID, two rows of
 * 320px cells with 1px rules between them and no gaps, on a `#0F172A`
 * ground with the cells one step darker. Measured at 1440px: 96px of
 * band padding, the section title as a teal-dashed eyebrow, a 36px
 * heading, a 15px/1.7 standfirst at `#94A3B8`, then the grid — each
 * cell 24px-padded with its ordinal in teal monospace, a 15px title
 * and a 13px/1.55 body at `#475569`.
 *
 * The ordinal comes from the item's own `date`, which is what the
 * platform's timeline rendering puts on its axis — the same field,
 * read as a step number rather than a year.
 */
defineProps<{
  title?: string
  heading?: string
  subheading?: string
  items?: { title: string, date?: string, text?: string }[]
}>()
</script>

<template>
  <section
    v-if="items?.length"
    class="
      border-b border-[#1E293B] bg-[#0F172A] px-5 py-16
      lg:px-20 lg:py-24
    "
  >
    <div class="mx-auto max-w-[1280px]">
      <p
        v-if="title"
        class="flex items-center gap-3"
      >
        <span
          aria-hidden="true"
          class="block h-px w-6 bg-[#5BC4C4]"
        />
        <span
          class="
            font-mono text-[10px] tracking-[0.2em] text-[#5BC4C4] uppercase
          "
        >{{ title }}</span>
      </p>
      <h2
        v-if="heading"
        class="
          mt-5 text-[26px] leading-[1.15] font-bold tracking-[-0.02em]
          text-white
          lg:text-[36px]
        "
      >
        {{ heading }}
      </h2>
      <p
        v-if="subheading"
        class="mt-4 max-w-[720px] text-[15px] leading-[1.7] text-[#94A3B8]"
      >
        {{ subheading }}
      </p>

      <ol
        class="
          mt-12 grid border-t border-l border-[#1E293B]
          sm:grid-cols-2
          lg:grid-cols-4
        "
      >
        <li
          v-for="item in items"
          :key="item.title"
          class="border-r border-b border-[#1E293B] bg-[#020617] p-6"
        >
          <p
            v-if="item.date"
            aria-hidden="true"
            class="font-mono text-[11px] text-[#5BC4C4]"
          >
            {{ item.date }}
          </p>
          <h3
            class="
              mt-3.5 text-[15px] leading-[1.35] font-semibold text-white
            "
          >
            {{ item.title }}
          </h3>
          <p
            v-if="item.text"
            class="mt-3 text-[13px] leading-[1.55] text-[#475569]"
          >
            {{ item.text }}
          </p>
        </li>
      </ol>
    </div>
  </section>
</template>
