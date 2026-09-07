<script lang="ts" setup>
import type { RouteLocationNamedI18n } from 'vue-router'

/**
 * Δelta Σigma's Εμπειρία band — three projects, and the way to all 48.
 *
 * Measured off the artboard at 1440px: a `#020617` ground with 96px
 * of padding, the section title as a teal-dashed eyebrow, a 36px
 * heading with "the full register →" on its baseline, then three
 * 416px `#0F172A` cards on a 16px gap — each headed by a 3px rule
 * whose colour CYCLES teal, emerald, amber, then a teal monospace
 * label, a 16px title, a 13.5px/1.6 body, and behind a 1px rule the
 * attribution: its label in dim monospace over the client's name in
 * `#CBD5E1` monospace.
 *
 * The cycling rule is the only thing on the page that uses colour
 * decoratively rather than to mean something, which is why the cycle
 * is fixed in code here rather than being a per-card prop: three
 * cards, three accents, no editorial decision to get wrong.
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
defineProps<{
  title?: string
  heading?: string
  metaLabel?: string
  ctaText?: string
  ctaLink?: string
  items?: { title: string, label?: string, text?: string, meta?: string }[]
}>()

const RULES = ['bg-primary', 'bg-success', 'bg-warning'] as const
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
          :to="(ctaLink ?? '/blog') as RouteLocationNamedI18n"
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

      <div
        class="
          mt-11 grid gap-4
          sm:grid-cols-2
          lg:grid-cols-3
        "
      >
        <article
          v-for="(item, index) in items"
          :key="item.title"
          class="
            flex h-full flex-col overflow-hidden rounded-lg border
            border-default bg-muted
          "
        >
          <span
            aria-hidden="true"
            class="block h-[3px]"
            :class="RULES[index % RULES.length]"
          />
          <div class="flex h-full flex-col p-6">
            <p
              v-if="item.label"
              class="
                font-mono text-[10.5px] tracking-[0.14em] text-primary
                uppercase
              "
            >
              {{ item.label }}
            </p>
            <h3
              class="
                mt-4 text-[16px] leading-[1.35] font-semibold text-highlighted
              "
            >
              {{ item.title }}
            </h3>
            <p
              v-if="item.text"
              class="mt-3.5 text-[13.5px] leading-[1.6] text-dimmed"
            >
              {{ item.text }}
            </p>
            <div
              v-if="item.meta"
              class="mt-auto border-t border-default pt-4.5"
            >
              <p
                v-if="metaLabel"
                class="text-[12px] text-dimmed"
              >
                {{ metaLabel }}
              </p>
              <p
                class="mt-1.5 font-mono text-[12px] text-toned"
              >
                {{ item.meta }}
              </p>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
