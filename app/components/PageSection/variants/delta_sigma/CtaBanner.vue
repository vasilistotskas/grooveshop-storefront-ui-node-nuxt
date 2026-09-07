<script lang="ts" setup>
import type { RouteLocationNamedI18n } from 'vue-router'

/**
 * Δelta Σigma's closing band — the ask.
 *
 * Measured off the artboard at 1440px: a `#020617` ground with 96px
 * of padding, a 36px/1.15 heading and a 15px/1.7 body left, and right
 * a 46px teal button with the phone number in monospace beneath it,
 * both flush with the track's right edge.
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
defineProps<{
  heading?: string
  description?: string
  buttonText?: string
  buttonLink?: string
}>()

const { phones } = useStoreOffices()
const phone = computed(() => phones.value[0])
</script>

<template>
  <section
    v-if="heading || buttonText"
    class="
      border-b border-default bg-default px-5 py-16
      lg:px-20 lg:py-24
    "
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
