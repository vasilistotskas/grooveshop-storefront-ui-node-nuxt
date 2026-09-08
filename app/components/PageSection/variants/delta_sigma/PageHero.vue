<script lang="ts" setup>
import type { RouteLocationNamedI18n } from 'vue-router'

/**
 * The top of every Δelta Σigma inner page — DeSET, the project
 * register, the seven fields, the eight phases, the partners, the
 * contact page. One band, six pages, because the artboards open each
 * of them the same way: the lattice, a teal-dashed eyebrow, a display
 * title, a standfirst, body copy, and then whichever of three
 * right-hand blocks that page needs.
 *
 * Measured off the artboards at 1440px: 96px of band padding, a 56px
 * display title on a 1.1 rhythm, a 20px standfirst, a 16px/1.7 body
 * on a 640px measure, and — where the page has one — a bordered
 * callout over a two-across grid of fact tiles.
 *
 * `callout.tone` is an ENUM resolved to tokens here, never a colour
 * from the layout: a merchant authoring a page cannot put a hex into
 * it, and the three tones follow the theme in both modes.
 *
 * COLOUR IS TOKENS, NOT LITERALS — see the sibling bands. Everything
 * here is `bg-default` / `bg-muted` / `border-default` / `text-muted`
 * / `text-primary`, so the band inverts for light mode on its own.
 */
const props = defineProps<{
  eyebrow?: string
  heading?: string
  standfirst?: string
  body?: string
  ctaText?: string
  ctaLink?: string
  secondaryCtaText?: string
  secondaryCtaLink?: string
  stats?: { value: string, label: string }[]
  callout?: {
    tone?: 'info' | 'warning' | 'success'
    title: string
    text?: string
    note?: string
  }
  facts?: { label: string, value: string }[]
}>()

/** Tone → tokens. The layout names a meaning; the design picks the ink. */
const TONES = {
  info: { icon: 'i-lucide:info', text: 'text-primary', border: 'border-primary/30' },
  warning: { icon: 'i-lucide:triangle-alert', text: 'text-warning', border: 'border-warning/30' },
  success: { icon: 'i-lucide:circle-check', text: 'text-success', border: 'border-success/30' },
} as const

const tone = computed(() => TONES[props.callout?.tone ?? 'info'])

/**
 * True when the page gives the hero a right-hand column at all.
 *
 * `stats` counts: the register artboard puts its trio opposite the
 * body rather than under it, which is the only placement any of these
 * boards gives a hero stat row.
 */
const hasAside = computed(
  () => !!props.callout || !!props.facts?.length || !!props.stats?.length,
)
</script>

<template>
  <section
    class="
      relative border-b border-default bg-default px-5 py-16
      lg:px-20 lg:py-24
    "
  >
    <div
      aria-hidden="true"
      class="
        pointer-events-none absolute inset-0 bg-[image:var(--ds-lattice)]
        bg-[size:80px_80px]
      "
    />

    <div
      class="
        relative mx-auto grid max-w-[1280px] items-start gap-12
        lg:gap-20
      "
      :class="hasAside ? 'lg:grid-cols-[1fr_minmax(0,506px)]' : ''"
    >
      <div>
        <p
          v-if="eyebrow"
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
          >{{ eyebrow }}</span>
        </p>

        <h1
          v-if="heading"
          class="
            mt-6 text-[40px] leading-[1.1] font-bold tracking-[-0.02em]
            text-highlighted
            lg:text-[56px]
          "
        >
          {{ heading }}
        </h1>

        <p
          v-if="standfirst"
          class="
            mt-6 max-w-[640px] text-[18px] leading-[1.45] font-semibold
            text-highlighted
            lg:text-[20px]
          "
        >
          {{ standfirst }}
        </p>

        <p
          v-if="body"
          class="mt-6 max-w-[640px] text-[16px] leading-[1.7] text-muted"
        >
          {{ body }}
        </p>

        <div
          v-if="ctaText || secondaryCtaText"
          class="
            mt-9 flex flex-col gap-3
            sm:flex-row
          "
        >
          <NuxtLinkLocale
            v-if="ctaText"
            :to="(ctaLink ?? '/contact') as RouteLocationNamedI18n"
            class="
              flex h-[46px] items-center justify-center gap-2 rounded-md
              bg-primary px-6 text-[14px] font-semibold text-inverted
              transition-colors
              hover:bg-primary/85
            "
          >
            {{ ctaText }}
            <UIcon
              name="i-lucide:arrow-right"
              class="size-4"
            />
          </NuxtLinkLocale>
          <NuxtLinkLocale
            v-if="secondaryCtaText"
            :to="(secondaryCtaLink ?? '/contact') as RouteLocationNamedI18n"
            class="
              flex h-[46px] items-center justify-center rounded-md border
              border-default px-6 text-[14px] font-medium text-default
              transition-colors
              hover:border-accented hover:bg-muted
            "
          >
            {{ secondaryCtaText }}
          </NuxtLinkLocale>
        </div>
      </div>

      <div
        v-if="hasAside"
        class="flex flex-col gap-4"
      >
        <dl
          v-if="stats?.length"
          class="
            flex flex-wrap gap-x-10 gap-y-6
            lg:justify-end
          "
        >
          <div
            v-for="stat in stats"
            :key="stat.label"
          >
            <dt class="sr-only">
              {{ stat.label }}
            </dt>
            <dd>
              <span
                class="
                  block text-[32px] leading-none font-bold
                  tracking-[-0.02em] text-highlighted
                  lg:text-[36px]
                "
              >{{ stat.value }}</span>
              <span
                aria-hidden="true"
                class="mt-2.5 block text-[12.5px] text-dimmed"
              >{{ stat.label }}</span>
            </dd>
          </div>
        </dl>

        <div
          v-if="callout"
          class="rounded-xl border bg-muted p-6"
          :class="tone.border"
        >
          <p class="flex items-center gap-2.5">
            <UIcon
              :name="tone.icon"
              class="size-4 shrink-0"
              :class="tone.text"
              aria-hidden="true"
            />
            <span
              class="text-[15px] font-semibold"
              :class="tone.text"
            >{{ callout.title }}</span>
          </p>
          <p
            v-if="callout.text"
            class="mt-3.5 text-[14px] leading-[1.7] text-muted"
          >
            {{ callout.text }}
          </p>
          <p
            v-if="callout.note"
            class="
              mt-4 border-t border-default pt-4 font-mono text-[12px]
              leading-[1.6] whitespace-pre-line
            "
            :class="tone.text"
          >
            {{ callout.note }}
          </p>
        </div>

        <dl
          v-if="facts?.length"
          class="
            grid gap-4
            sm:grid-cols-2
          "
        >
          <div
            v-for="fact in facts"
            :key="fact.label"
            class="rounded-lg border border-default bg-muted px-5 py-4"
          >
            <dt
              class="
                font-mono text-[10px] tracking-[0.14em] text-dimmed uppercase
              "
            >
              {{ fact.label }}
            </dt>
            <dd
              class="mt-2 font-mono text-[15px] leading-tight text-default"
            >
              {{ fact.value }}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  </section>
</template>
