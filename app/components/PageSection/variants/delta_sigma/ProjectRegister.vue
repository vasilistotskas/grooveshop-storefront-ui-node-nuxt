<script lang="ts" setup>
/**
 * "Μητρώο έργων" — the reference list as a REGISTER: one numbered row
 * per installation, filterable by sector. Not a blog index and not a
 * card grid: no images, no pagination, no detail pages, because the
 * rows are records rather than articles and the artboard prints all
 * forty-eight of them at once.
 *
 * Measured off the register artboard at 1440px: a 1280px track inside
 * an 80px gutter, a 38px filter chip on a 9px gap, then a table whose
 * header is 10px monospace on a 20px padding and whose rows are 86px
 * apart — 20px of padding around a 16px title with a 12.5px monospace
 * technical line under it, hairline-ruled between rows. That 86px is
 * measured, not chosen: `py-6` around the same content came out 98px
 * and made the register 550px longer than its board. The columns
 * are 60px of ordinal, 175px of sector pill, the title, and the
 * contracting company right-aligned to the track's edge.
 *
 * The ORDINAL is the row's place in the whole register, assigned once
 * and kept under a filter — it is the record's number, not a count of
 * what happens to be on screen, so filtering to a sector shows 06-08
 * rather than renumbering them 01-03.
 *
 * The sector palette is CATEGORICAL and indexed by the sector's
 * position in `sectors`, so nothing in the data names a colour. The
 * first step is the brand (`primary` — measured `#5BC4C4` on the
 * artboard, which IS this tenant's primary token); the other six are
 * fixed hues, deliberately NOT semantic tokens: a category palette
 * must stay mutually distinguishable and must not shift when the
 * theme does, and "error" would be a lie about waste management.
 * Every step carries both modes, since a 400 shade cannot sit on white.
 *
 * The filter is component state, not a query parameter: the page is
 * served from the route cache, and a `?sector=` would make one cached
 * HTML per sector while adding nothing a visitor can act on — the
 * whole register is already on the page.
 *
 * COLOUR IS TOKENS, NOT LITERALS elsewhere in the band — the ground is
 * `bg-default`, the rules `border-default`, the title
 * `text-highlighted`, the technical line `text-dimmed` and the company
 * `text-muted`, all measured as this tenant's own resolved tokens
 * (`#020617`, `#1E293B`, `#FFFFFF`, `#64748B`, `#94A3B8`).
 *
 * One deviation from the artboard, deliberate: it prints the ordinal
 * at `#334155`, which is 1.9:1 on the dark ground. It is rendered
 * `text-dimmed` instead — the dimmest step the design system offers
 * for real text — because the ordinal is the record's identifier, not
 * decoration.
 */
interface Sector { key: string, label: string }
interface Entry { sector?: string, title: string, note?: string, meta?: string }

const props = defineProps<{
  metaLabel?: string
  note?: string
  sectors?: Sector[]
  items?: Entry[]
}>()

const { t } = useI18n()

/**
 * Tone per sector INDEX. `primary` leads because the artboard's first
 * sector is the brand teal; the rest are fixed hues at 12% for the
 * ground and a shade that clears AA on it for the ink.
 */
const SECTOR_TONES = [
  'bg-primary/12 text-primary',
  'bg-blue-600/10 text-blue-700 dark:bg-blue-400/12 dark:text-blue-400',
  'bg-emerald-600/10 text-emerald-700 dark:bg-emerald-400/12 dark:text-emerald-400',
  'bg-amber-600/10 text-amber-700 dark:bg-amber-400/12 dark:text-amber-400',
  'bg-slate-600/10 text-slate-700 dark:bg-slate-400/12 dark:text-slate-400',
  'bg-rose-600/10 text-rose-700 dark:bg-rose-400/12 dark:text-rose-400',
  'bg-violet-600/10 text-violet-700 dark:bg-violet-400/12 dark:text-violet-400',
] as const

/** Sector key → its tone and label, resolved once per props change. */
const sectorIndex = computed(() => new Map(
  (props.sectors ?? []).map((sector, index) => [sector.key, {
    label: sector.label,
    tone: SECTOR_TONES[index % SECTOR_TONES.length]!,
  }]),
))

/**
 * The register, numbered in source order. The ordinal is decided here
 * — before any filtering — which is what keeps it stable.
 */
const register = computed(() => (props.items ?? []).map((item, index) => ({
  ...item,
  ordinal: String(index + 1).padStart(2, '0'),
  sectorLabel: item.sector ? sectorIndex.value.get(item.sector)?.label : undefined,
  tone: (item.sector ? sectorIndex.value.get(item.sector)?.tone : undefined)
    ?? 'bg-elevated text-muted',
})))

/** Only sectors that actually have rows: a chip that empties the table is a dead control. */
const chips = computed(() => (props.sectors ?? [])
  .map(sector => ({
    ...sector,
    count: register.value.filter(entry => entry.sector === sector.key).length,
  }))
  .filter(sector => sector.count > 0))

const active = ref<string | null>(null)

const visible = computed(() => active.value === null
  ? register.value
  : register.value.filter(entry => entry.sector === active.value))

/** Re-selecting the active chip clears the filter, which is what a pressed toggle promises. */
function toggle(key: string) {
  active.value = active.value === key ? null : key
}
</script>

<template>
  <section
    v-if="register.length"
    class="
      border-b border-default bg-default px-5 pt-8 pb-16
      lg:px-20 lg:pt-10 lg:pb-24
    "
  >
    <div class="mx-auto max-w-[1280px]">
      <div
        v-if="chips.length > 1"
        role="group"
        :aria-label="t('register.filterLabel')"
        class="flex flex-wrap gap-x-2.5 gap-y-2"
      >
        <button
          type="button"
          :aria-pressed="active === null"
          class="
            flex h-[38px] cursor-pointer items-center gap-2.5 rounded-full
            px-4 text-[13.5px] transition-colors
          "
          :class="active === null
            ? 'bg-primary font-medium text-inverted'
            : 'border border-default text-default hover:border-accented hover:bg-muted'"
          @click="active = null"
        >
          {{ t('register.all') }}
          <span
            class="font-mono text-[11.5px]"
            :class="active === null ? 'text-inverted/60' : 'text-dimmed'"
          >{{ register.length }}</span>
        </button>
        <button
          v-for="chip in chips"
          :key="chip.key"
          type="button"
          :aria-pressed="active === chip.key"
          class="
            flex h-[38px] cursor-pointer items-center gap-2.5 rounded-full
            px-4 text-[13.5px] transition-colors
          "
          :class="active === chip.key
            ? 'bg-primary font-medium text-inverted'
            : 'border border-default text-default hover:border-accented hover:bg-muted'"
          @click="toggle(chip.key)"
        >
          {{ chip.label }}
          <span
            class="font-mono text-[11.5px]"
            :class="active === chip.key ? 'text-inverted/60' : 'text-dimmed'"
          >{{ chip.count }}</span>
        </button>
      </div>

      <div class="mt-6 border-b border-default">
        <div
          class="
            flex items-baseline justify-between gap-4 border-t border-default
            py-5 font-mono text-[10px] tracking-[0.14em] uppercase text-dimmed
          "
        >
          <span aria-live="polite">{{ t('register.count', { count: visible.length }) }}</span>
          <span v-if="metaLabel">{{ metaLabel }}</span>
        </div>

        <ol class="list-none">
          <li
            v-for="entry in visible"
            :key="entry.ordinal"
            class="
              grid gap-y-2.5 border-t border-default py-5
              lg:grid-cols-[60px_175px_minmax(0,1fr)_auto] lg:items-baseline
              lg:gap-y-0
            "
          >
            <div
              class="
                flex items-center gap-3
                lg:contents
              "
            >
              <span class="font-mono text-[11px] text-dimmed">{{ entry.ordinal }}</span>
              <span v-if="entry.sectorLabel">
                <span
                  class="
                    inline-flex h-[22px] items-center rounded-full px-2.5
                    text-[11.5px] font-medium
                  "
                  :class="entry.tone"
                >
                  <span class="sr-only">{{ t('register.sector') }}: </span>
                  {{ entry.sectorLabel }}
                </span>
              </span>
            </div>

            <div>
              <p
                class="
                  text-[16px] leading-[1.35] font-semibold text-highlighted
                "
              >
                {{ entry.title }}
              </p>
              <p
                v-if="entry.note"
                class="mt-1 font-mono text-[12.5px] leading-[1.6] text-dimmed"
              >
                {{ entry.note }}
              </p>
            </div>

            <p
              v-if="entry.meta"
              class="
                text-[13.5px] leading-[1.5] text-muted
                lg:text-right
              "
            >
              <span class="sr-only">{{ metaLabel ?? t('register.meta') }}: </span>
              {{ entry.meta }}
            </p>
          </li>
        </ol>
      </div>

      <p
        v-if="note"
        class="
          mt-8 flex items-start gap-3 rounded-lg border border-default bg-muted
          px-5 py-4 text-[13px] leading-[1.6] text-muted
          lg:items-center
        "
      >
        <UIcon
          name="i-lucide:info"
          class="mt-0.5 size-4 shrink-0 text-dimmed lg:mt-0"
          aria-hidden="true"
        />
        {{ note }}
      </p>
    </div>
  </section>
</template>

<i18n lang="yaml">
el:
  register:
    all: Όλα
    count: "{count} έργο | {count} έργα"
    filterLabel: Φιλτράρετε ανά τομέα
    sector: Τομέας
    meta: Ανάδοχος
en:
  register:
    all: All
    count: "{count} project | {count} projects"
    filterLabel: Filter by sector
    sector: Sector
    meta: Contractor
</i18n>
