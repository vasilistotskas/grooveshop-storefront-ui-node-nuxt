<script lang="ts" setup>
import type { RouteLocationNamedI18n } from 'vue-router'

/**
 * Δelta Σigma's Ειδίκευση band — the seven fields, plus the cell that
 * answers "what if mine is not one of them?".
 *
 * Measured off the artboard at 1440px: a `#020617` ground with 96px
 * of padding, the section title as a teal-dashed eyebrow, a 36px
 * heading with the band's own link on its baseline at the right, then
 * a four-across grid of 302px `#0F172A` cards on a 24px gap — each
 * with a 36px teal-tinted icon tile, its ordinal in dim monospace at
 * the opposite corner, a 15px title and a 13px/1.6 body at `#475569`.
 *
 * The prompt cell drops the tile and the ordinal and pins its link to
 * the bottom, so it lines up with the row however tall the row grows.
 *
 * On a phone the mobile artboard shows the same seven fields as a
 * NUMBERED LIST instead — one bordered box, a row per field, the
 * ordinal in dim monospace and a chevron at the end, no tiles and no
 * body copy. Seven cards each carrying an icon tile and three lines
 * of description is most of a phone screen per field; the list is the
 * same information at a glance. Both are rendered from the same
 * `items`, one hidden per breakpoint.
 *
 * COLOUR IS TOKENS, NOT LITERALS. Every value the artboards use turned
 * out to be a step on the tenant's own ramps — `#020617` is
 * `--ui-bg` in dark, `#1E293B` is `--ui-border`, `#94A3B8` is
 * `--ui-text-muted`, and `#5BC4C4` is `--ui-primary` exactly — so this
 * band is written in `bg-default` / `bg-muted` / `border-default` /
 * `text-muted` / `text-primary` and inverts for light mode on its own.
 * The hexes below are the MEASUREMENT that established the mapping,
 * not what the markup says.
 */
const props = defineProps<{
  title?: string
  heading?: string
  items?: { title: string, text?: string, icon?: string }[]
  ctaText?: string
  ctaLink?: string
  prompt?: {
    title: string
    text?: string
    ctaText?: string
    ctaLink?: string
  }
}>()

/** `01`…`07` — the artboard numbers the fields in the grid's order. */
const ordinal = (index: number) => String(index + 1).padStart(2, '0')

const hasHeader = computed(() => !!(props.title || props.heading))
</script>

<template>
  <section
    v-if="items?.length"
    class="
      border-b border-default bg-default px-5 py-16
      lg:px-20 lg:py-24
    "
  >
    <div class="mx-auto max-w-[1280px]">
      <div
        v-if="hasHeader"
        class="
          flex flex-col gap-4
          lg:flex-row lg:items-end lg:justify-between lg:gap-8
        "
      >
        <div>
          <p
            v-if="title"
            class="flex items-center gap-3"
          >
            <span
              aria-hidden="true"
              class="block h-px w-6 bg-primary"
            />
            <span
              class="
                font-mono text-[10px] tracking-[0.2em] text-primary uppercase
              "
            >{{ title }}</span>
          </p>
          <h2
            v-if="heading"
            class="
              mt-5 text-[26px] leading-[1.15] font-bold tracking-[-0.02em]
              text-highlighted
              lg:text-[36px]
            "
          >
            {{ heading }}
          </h2>
        </div>
        <NuxtLinkLocale
          v-if="ctaText"
          :to="(ctaLink ?? '/contact') as RouteLocationNamedI18n"
          class="
            flex shrink-0 items-center gap-2 text-[13.5px] text-primary
            transition-colors
            hover:text-primary/80
          "
        >
          {{ ctaText }}
          <UIcon
            name="i-lucide:arrow-right"
            class="size-3.5"
          />
        </NuxtLinkLocale>
      </div>

      <!-- Phone: the numbered list. -->
      <ul
        class="
          mt-8 overflow-hidden rounded-lg border border-default bg-muted
          sm:hidden
        "
      >
        <li
          v-for="(item, index) in items"
          :key="`row-${item.title}`"
          :class="index > 0 ? 'border-t border-default' : ''"
        >
          <NuxtLinkLocale
            :to="(ctaLink ?? '/contact') as RouteLocationNamedI18n"
            class="flex items-center gap-4 px-5 py-4"
          >
            <span
              aria-hidden="true"
              class="shrink-0 font-mono text-[11px] text-dimmed"
            >{{ ordinal(index) }}</span>
            <span
              class="
                flex-1 text-[14px] leading-[1.35] font-semibold text-highlighted
              "
            >{{ item.title }}</span>
            <UIcon
              name="i-lucide:chevron-right"
              class="size-4 shrink-0 text-dimmed"
              aria-hidden="true"
            />
          </NuxtLinkLocale>
        </li>
      </ul>

      <div
        class="
          mt-11 hidden gap-6
          sm:grid sm:grid-cols-2
          lg:grid-cols-4
        "
      >
        <div
          v-for="(item, index) in items"
          :key="item.title"
          class="
            flex h-full flex-col rounded-lg border border-default
            bg-muted p-6
          "
        >
          <div class="flex items-start justify-between gap-3">
            <span
              v-if="item.icon"
              class="
                flex size-9 items-center justify-center rounded-md
                bg-primary/10
              "
            >
              <UIcon
                :name="item.icon"
                class="size-4.5 text-primary"
                aria-hidden="true"
              />
            </span>
            <span
              aria-hidden="true"
              class="font-mono text-[11px] text-dimmed"
            >{{ ordinal(index) }}</span>
          </div>
          <h3
            class="
              mt-3.5 text-[15px] leading-[1.35] font-semibold text-highlighted
            "
          >
            {{ item.title }}
          </h3>
          <p
            v-if="item.text"
            class="mt-3 text-[13px] leading-[1.6] text-dimmed"
          >
            {{ item.text }}
          </p>
        </div>

        <div
          v-if="prompt"
          class="
            flex h-full flex-col rounded-lg border border-default
            bg-muted p-6
          "
        >
          <h3
            class="text-[15px] leading-[1.35] font-semibold text-highlighted"
          >
            {{ prompt.title }}
          </h3>
          <p
            v-if="prompt.text"
            class="mt-3.5 text-[13px] leading-[1.6] text-dimmed"
          >
            {{ prompt.text }}
          </p>
          <NuxtLinkLocale
            v-if="prompt.ctaText"
            :to="(prompt.ctaLink ?? '/contact') as RouteLocationNamedI18n"
            class="
              mt-auto flex items-center gap-2 pt-6 text-[13.5px] text-primary
              transition-colors
              hover:text-primary/80
            "
          >
            {{ prompt.ctaText }}
            <UIcon
              name="i-lucide:arrow-right"
              class="size-3.5"
            />
          </NuxtLinkLocale>
        </div>
      </div>
    </div>
  </section>
</template>
