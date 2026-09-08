<script lang="ts" setup>
import type { RouteLocationNamedI18n } from 'vue-router'

/**
 * Δelta Σigma's closing band — the ask.
 *
 * Measured off the artboards at 1440px: 88px of band padding, a
 * 36px/1.15 heading and a 15px/1.7 body left, and right a 46px teal
 * button with the phone number in monospace beneath it, both flush
 * with the track's right edge.
 *
 * 88px is the least-wrong SINGLE value, and deliberately one value:
 * the four boards that draw this band disagree — the home page's is
 * 92px, the register's 83, DeSET's and δραστηριότητες' 80 — while
 * every other band on every board sits between 88 and 100. One
 * padding puts this band within 8px of all four; a per-page prop
 * would encode a rhythm the boards do not actually keep.
 *
 * The phone is NOT a prop: it is the merchant's own first published
 * number, the same one the footer prints, and a second copy in a
 * section prop is a second copy to go stale. Absent `STORE_OFFICES`,
 * the button stands alone — which is what the platform's own
 * `cta_banner` renders anyway.
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
  heading?: string
  description?: string
  buttonText?: string
  buttonLink?: string
  surface?: 'default' | 'muted'
}>()

const { phones } = useStoreOffices()
const phone = computed(() => phones.value[0])

/**
 * Which of the two page surfaces the band paints. `default` is what
 * the home and συνεργάτες boards show; the register's board raises it,
 * because there the band above is the ground and two adjacent bands
 * sharing a surface read as one.
 */
const ground = computed(() =>
  props.surface === 'muted' ? 'bg-muted' : 'bg-default',
)
</script>

<template>
  <section
    v-if="heading || buttonText"
    class="
      border-b border-default px-5 py-16
      lg:px-20 lg:py-22
    "
    :class="ground"
  >
    <div
      class="
        mx-auto flex max-w-[1280px] flex-col gap-10
        lg:flex-row lg:items-start lg:justify-between lg:gap-16
      "
    >
      <div class="max-w-[680px]">
        <h2
          v-if="heading"
          class="
            text-[26px] leading-[1.15] font-bold tracking-[-0.02em] text-highlighted
            lg:text-[36px]
          "
        >
          {{ heading }}
        </h2>
        <p
          v-if="description"
          class="mt-5 text-[15px] leading-[1.7] text-dimmed"
        >
          {{ description }}
        </p>
      </div>

      <div
        v-if="buttonText"
        class="
          flex shrink-0 flex-col gap-3
          lg:items-end
        "
      >
        <NuxtLinkLocale
          :to="(buttonLink ?? '/contact') as RouteLocationNamedI18n"
          class="
            flex h-[46px] items-center justify-center gap-2 rounded-md
            bg-primary px-7 text-[14px] font-semibold text-inverted
            transition-colors
            hover:bg-primary/85
          "
        >
          {{ buttonText }}
          <UIcon
            name="i-lucide:arrow-right"
            class="size-4"
          />
        </NuxtLinkLocale>
        <a
          v-if="phone"
          :href="`tel:${phone.replace(/\s+/g, '')}`"
          class="
            font-mono text-[12.5px] text-muted transition-colors
            hover:text-highlighted
          "
        >{{ phone }}</a>
      </div>
    </div>
  </section>
</template>
