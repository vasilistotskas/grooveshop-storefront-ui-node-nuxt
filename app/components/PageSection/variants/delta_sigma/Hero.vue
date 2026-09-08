<script lang="ts" setup>
import type { RouteLocationNamedI18n } from 'vue-router'

/**
 * Δelta Σigma's hero band, measured off the artboards.
 *
 * Two columns on an 80px lattice: the copy left, a live-looking
 * telemetry panel right, a proof row underneath. Read from the
 * reference render at 1440px — an 80px gutter, a 1280px track, two
 * 592px columns with a 96px gap, 88px of band padding, a 56px/65px
 * display heading whose LAST line is brand teal, a 17px/1.7 body at
 * `#94A3B8`, a 46px-tall CTA pair and a 25px monospace stat row.
 *
 * Two accents, used consistently and not interchangeably: `#5BC4C4`
 * is the brand (eyebrow, the heading's last line, buttons, protocol
 * names) and `#34D399` is LIVE (the panel's status dot, its in-spec
 * frequency, the signal dots). Written as arbitrary values because
 * this is one tenant's band, not a new set of platform tokens — the
 * same call as `Chrome/variants/delta_sigma`.
 *
 * The copy, the CTAs and the stats are DATA (`hero_banner` props, per
 * locale). The telemetry panel is not: it is an illustration of what
 * DeSET reports, labelled "indicative data" in the artboards, built
 * from technical strings (`CB_MAIN_STATUS`, `kVAr`, `IEC 60870-5-104`)
 * that are the same in both languages. It lives in this component's
 * own i18n block, which is where the platform already keeps
 * variant-specific marketing copy (`PageSection/variants/webside/*`).
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
  eyebrow?: string
  heading?: string
  subheading?: string
  ctaText?: string
  ctaLink?: string
  secondaryCtaText?: string
  secondaryCtaLink?: string
  stats?: { value: string, label: string }[]
}>()

const { t, tm, rt } = useI18n()

/**
 * The heading's last LINE is teal in the artboards — the turn from
 * what the company builds to the promise about it ("…with the key in
 * your hand."). Split on the last clause rather than at a fixed
 * character count so the emphasis lands on a clause in both languages
 * and however the operator rewrites it.
 *
 * The accent renders as a BLOCK, so it starts a line of its own
 * however the lead wraps — the structural half of the artboard's
 * device, and the half that survives translation. Where the LEAD's
 * own line breaks fall is left to the browser: the artboard's are
 * hand-set and no single max-width reproduces them (its lead wraps as
 * though the column were 470px while its accent line needs 563).
 */
const headingParts = computed(() => {
  const text = (props.heading ?? '').trim()
  if (!text) return { lead: '', accent: '' }
  // Greek and English both end the lead clause on a comma here; fall
  // back to the whole string as the lead when there is none, which
  // renders an all-white heading rather than an arbitrary split.
  const cut = text.lastIndexOf(', ')
  if (cut === -1) return { lead: text, accent: '' }
  return { lead: `${text.slice(0, cut + 1)} `, accent: text.slice(cut + 2) }
})

interface Station {
  tab: string
  name: string
  code: string
  status: string
}
interface Metric {
  label: string
  value: string
  unit?: string
  live?: boolean
}
interface Signal {
  name: string
  value: string
  live?: boolean
}

// `tm` returns the raw message tree; `rt` resolves each leaf. Objects
// in an <i18n> block come back as compiled message functions, not
// plain strings, so every field has to go through `rt`.
const stations = computed<Station[]>(() =>
  (tm('panel.stations') as unknown[]).map((raw) => {
    const entry = raw as Record<string, unknown>
    return {
      tab: rt(entry.tab as string),
      name: rt(entry.name as string),
      code: rt(entry.code as string),
      status: rt(entry.status as string),
    }
  }),
)

const metrics = computed<Metric[]>(() =>
  (tm('panel.metrics') as unknown[]).map((raw) => {
    const entry = raw as Record<string, unknown>
    return {
      label: rt(entry.label as string),
      value: rt(entry.value as string),
      unit: entry.unit ? rt(entry.unit as string) : undefined,
      live: entry.live === true,
    }
  }),
)

const signals = computed<Signal[]>(() =>
  (tm('panel.signals') as unknown[]).map((raw) => {
    const entry = raw as Record<string, unknown>
    return {
      name: rt(entry.name as string),
      value: rt(entry.value as string),
      live: entry.live === true,
    }
  }),
)

const active = ref(0)
const station = computed(() => stations.value[active.value])
</script>

<template>
  <section
    class="
      relative border-b border-default bg-default px-5 py-14
      lg:px-20 lg:py-22
    "
  >
    <!-- The 80px lattice. Anchored to the band's own top-left, which
         is where the artboard's lines start, and drawn from
         `--ds-lattice` (app/assets/css/main.css) so the line colour
         follows the neutral ramp and the grid stays legible on the
         light ground instead of vanishing into it. -->
    <div
      aria-hidden="true"
      class="
        pointer-events-none absolute inset-0
        bg-[image:var(--ds-lattice)]
        bg-[size:80px_80px]
      "
    />

    <div
      class="
        relative mx-auto grid max-w-[1280px] items-start gap-12
        lg:grid-cols-2 lg:gap-24
      "
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

        <!-- The page's h1. `hero_banner` is in
             `HEADING_SECTION_TYPES`, so `pages/index.vue` stands its
             own PageTitle down for it — and this variant was rendering
             an h2, which left the homepage with no h1 at all (7 h2s,
             19 h3s, nothing above them). The platform's own
             `HeroBanner.vue` gets this right. -->
        <h1
          v-if="heading"
          class="
            mt-7 text-[40px] leading-[1.16] font-bold tracking-[-0.02em]
            text-highlighted
            lg:text-[56px]
          "
        >
          {{ headingParts.lead }}<span
            v-if="headingParts.accent"
            class="block text-primary"
          >{{ headingParts.accent }}</span>
        </h1>

        <p
          v-if="subheading"
          class="
            mt-7 max-w-[540px] text-[16px] leading-[1.7] text-muted
            lg:text-[17px]
          "
        >
          {{ subheading }}
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

        <dl
          v-if="stats?.length"
          class="
            mt-12 grid grid-cols-3 gap-x-4 gap-y-6
            sm:mt-14 sm:flex sm:flex-wrap sm:gap-x-8
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
                  block font-mono text-[25px] leading-none font-medium
                  text-highlighted
                "
              >{{ stat.value }}</span>
              <span
                aria-hidden="true"
                class="mt-2.5 block text-[12.5px] text-dimmed"
              >{{ stat.label }}</span>
            </dd>
          </div>
        </dl>
      </div>

      <!-- The telemetry illustration. `aria-hidden` on the numbers
           only: a screen reader is told what the panel IS (its
           caption) and spared four dozen indicative readings. -->
      <div
        class="
          overflow-hidden rounded-xl border border-default bg-muted
        "
      >
        <div
          class="
            flex items-center justify-between gap-3 border-b border-default
            bg-default px-5 py-3.5
          "
        >
          <span class="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              class="block size-2 rounded-full bg-success"
            />
            <span
              class="
                font-mono text-[11px] tracking-[0.12em] text-muted
              "
            >{{ t('panel.title') }}</span>
          </span>
          <span
            class="font-mono text-[11px] text-dimmed"
          >{{ t('panel.note') }}</span>
        </div>

        <div
          v-if="station"
          class="px-5 pt-4 pb-5"
        >
          <div
            class="flex flex-wrap"
            role="tablist"
            :aria-label="t('panel.stationsLabel')"
          >
            <button
              v-for="(entry, index) in stations"
              :key="entry.code"
              type="button"
              role="tab"
              :aria-selected="index === active"
              class="
                rounded-t-md border border-b-0 px-4 py-2 font-mono
                text-[11px] leading-none tracking-[0.12em] uppercase
                transition-colors
              "
              :class="index === active
                ? 'border-default text-primary'
                : 'border-transparent text-dimmed hover:text-muted'"
              @click="active = index"
            >
              {{ entry.tab }}
            </button>
          </div>

          <div
            class="
              mt-4 flex flex-col gap-4 border-b border-default pb-4
              sm:flex-row sm:items-start sm:justify-between
            "
          >
            <div>
              <p class="text-[17px] leading-tight font-semibold text-highlighted">
                {{ station.name }}
              </p>
              <p
                class="
                  mt-1.5 font-mono text-[12px] leading-none text-dimmed
                "
              >
                {{ station.code }}
              </p>
            </div>
            <span
              class="
                flex shrink-0 items-center gap-2 rounded-full border
                border-success/30 px-3.5 py-1.5 font-mono text-[11px]
                tracking-[0.12em] text-success uppercase
              "
            >
              <span
                aria-hidden="true"
                class="block size-1.5 rounded-full bg-success"
              />
              {{ station.status }}
            </span>
          </div>

          <div
            class="
              mt-4 grid grid-cols-2 border-t border-l border-default
              sm:grid-cols-3
            "
          >
            <div
              v-for="metric in metrics"
              :key="metric.label"
              class="border-r border-b border-default px-4 py-3"
            >
              <p
                class="
                  font-mono text-[10px] tracking-[0.12em] text-dimmed
                  uppercase
                "
              >
                {{ metric.label }}
              </p>
              <p class="mt-2 flex items-baseline gap-1">
                <span
                  class="font-mono text-[23px] leading-none font-medium"
                  :class="metric.live ? 'text-success' : 'text-highlighted'"
                >{{ metric.value }}</span>
                <span
                  v-if="metric.unit"
                  class="font-mono text-[10px] text-dimmed"
                >{{ metric.unit }}</span>
              </p>
            </div>
          </div>

          <!-- The mobile artboard drops the signal table: its rows
               are `NAME … VALUE ●` pairs that cannot narrow without
               either truncating a signal name or wrapping every row
               into two. The metric tiles reflow to two columns and
               carry the reading a phone visitor came for. -->
          <div
            class="
              mt-4 hidden rounded-md border border-default
              sm:block
            "
          >
            <div
              class="
                flex items-center justify-between gap-3 border-b
                border-default bg-default px-4 py-2
              "
            >
              <span
                class="
                  font-mono text-[10px] tracking-[0.12em] text-dimmed
                  uppercase
                "
              >{{ t('panel.signalsLabel') }}</span>
              <span
                class="font-mono text-[10px] text-primary"
              >{{ t('panel.protocol') }}</span>
            </div>
            <div
              v-for="(signal, index) in signals"
              :key="signal.name"
              class="flex items-center justify-between gap-3 px-4 py-2"
              :class="index > 0 ? 'border-t border-default' : ''"
            >
              <span
                class="font-mono text-[11.5px] text-muted"
              >{{ signal.name }}</span>
              <span class="flex items-center gap-2.5">
                <span
                  class="font-mono text-[11.5px] text-default"
                >{{ signal.value }}</span>
                <span
                  aria-hidden="true"
                  class="block size-1.5 rounded-full"
                  :class="signal.live ? 'bg-success' : 'bg-accented'"
                />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<i18n lang="yaml">
el:
  panel:
    title: DeSET · ΤΗΛΕΠΟΠΤΕΙΑ
    note: ενδεικτικά δεδομένα
    stationsLabel: Σταθμοί
    signalsLabel: Σήματα προς SCADA/DMS ΔΕΔΔΗΕ
    protocol: IEC 60870-5-104
    stations:
      - tab: Αμπελώνας
        name: Μονάδα βιοαερίου, Αμπελώνας Λαρίσης
        code: DS-EL-1042 · Βιοαέριο
        status: Σε λειτουργία
      - tab: Κάρυστος
        name: Αιολικό πάρκο, Κάρυστος Ευβοίας
        code: DS-EL-0871 · Αιολικό
        status: Σε λειτουργία
      - tab: Ν. Τένεδος
        name: Φωτοβολταϊκός σταθμός, Ν. Τένεδος Σερρών
        code: DS-EL-1310 · Φωτοβολταϊκό
        status: Σε λειτουργία
    metrics:
      - label: Ενεργός ισχύς
        value: '1.842'
        unit: kW
      - label: Άεργος ισχύς
        value: '214'
        unit: kVAr
      - label: Τάση L1-L2
        value: '20.4'
        unit: kV
      - label: Συχνότητα
        value: '50.01'
        unit: Hz
        live: true
      - label: Συν φ
        value: '0.99'
      - label: Ημερ. παραγωγή
        value: '38.7'
        unit: MWh
    signals:
      - name: CB_MAIN_STATUS
        value: CLOSED
        live: true
      - name: SETPOINT_P_LIMIT
        value: 100 %
        live: true
      - name: REMOTE_CTRL_ENABLE
        value: 'TRUE'
        live: true
      - name: LOCAL_ALARM
        value: NONE
en:
  panel:
    title: DeSET · TELECONTROL
    note: indicative data
    stationsLabel: Stations
    signalsLabel: Signals to the DEDDIE SCADA/DMS
    protocol: IEC 60870-5-104
    stations:
      - tab: Ampelonas
        name: Biogas plant, Ampelonas Larissa
        code: DS-EL-1042 · Biogas
        status: In service
      - tab: Karystos
        name: Wind farm, Karystos Evia
        code: DS-EL-0871 · Wind
        status: In service
      - tab: N. Tenedos
        name: Solar plant, N. Tenedos Serres
        code: DS-EL-1310 · Solar
        status: In service
    metrics:
      - label: Active power
        value: '1,842'
        unit: kW
      - label: Reactive power
        value: '214'
        unit: kVAr
      - label: Voltage L1-L2
        value: '20.4'
        unit: kV
      - label: Frequency
        value: '50.01'
        unit: Hz
        live: true
      - label: Power factor
        value: '0.99'
      - label: Daily output
        value: '38.7'
        unit: MWh
    signals:
      - name: CB_MAIN_STATUS
        value: CLOSED
        live: true
      - name: SETPOINT_P_LIMIT
        value: 100 %
        live: true
      - name: REMOTE_CTRL_ENABLE
        value: 'TRUE'
        live: true
      - name: LOCAL_ALARM
        value: NONE
</i18n>
