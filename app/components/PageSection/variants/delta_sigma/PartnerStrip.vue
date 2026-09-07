<script lang="ts" setup>
import type { RouteLocationNamedI18n } from 'vue-router'

/**
 * The band between the hero and the DeSET section: a tracked label
 * left, the manufacturer names centred, the Γ.Ε.ΜΗ. number right.
 *
 * Measured off the artboard at 1440px — a 75px band on `#091121`
 * between two 1px `#1E293B` rules, an 11px/0.16em monospace label at
 * `#334155`, 18px semibold names at `#475569` on a 48px rhythm, and
 * the registration number in 11px monospace at the track's right
 * edge.
 *
 * Three parts, and the middle one is centred in the FULL track rather
 * than in the space left over — which is why this is a
 * `1fr auto 1fr` grid and not `justify-between`.
 *
 * The names are data (`partner_strip` props, so the operator can add
 * one). The registration number is NOT a prop: it is the same
 * merchant identity the footer prints, and a second copy in a section
 * prop is a second copy to go stale.
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
  label?: string
  items?: { name: string, href?: string }[]
}>()

const { t } = useI18n()
const { identity } = useMerchantIdentity()
</script>

<template>
  <section
    v-if="items?.length"
    class="
      border-b border-default bg-muted px-5 py-6
      lg:px-20
    "
  >
    <div
      class="
        mx-auto flex max-w-[1280px] flex-col items-center gap-5
        lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-6
      "
    >
      <p
        v-if="label"
        class="
          font-mono text-[11px] tracking-[0.16em] text-dimmed uppercase
        "
      >
        {{ label }}
      </p>
      <ul
        class="
          flex flex-wrap items-center justify-center gap-x-8 gap-y-3
          lg:gap-x-12
        "
      >
        <li
          v-for="item in items"
          :key="item.name"
          class="text-[16px] font-semibold text-dimmed lg:text-[18px]"
        >
          <NuxtLinkLocale
            v-if="item.href"
            :to="item.href as RouteLocationNamedI18n"
            class="transition-colors hover:text-muted"
          >
            {{ item.name }}
          </NuxtLinkLocale>
          <template v-else>
            {{ item.name }}
          </template>
        </li>
      </ul>
      <p
        v-if="identity?.registrationNumber"
        class="
          font-mono text-[11px] text-dimmed
          lg:justify-self-end
        "
      >
        {{ t('gemi') }} {{ identity.registrationNumber }}
      </p>
    </div>
  </section>
</template>

<i18n lang="yaml">
el:
  gemi: Γ.Ε.ΜΗ.
en:
  gemi: GEMI
</i18n>
