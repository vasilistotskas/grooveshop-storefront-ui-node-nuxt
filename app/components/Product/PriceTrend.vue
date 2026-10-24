<script lang="ts" setup>
import type { TabsItem } from '#ui/types'
import { areaY, defineChart, dot, lineY } from '@tanstack/charts'
import { crosshair } from '@tanstack/charts/crosshair'
import { decorative } from '@tanstack/charts/mark/decorative'
import { scaleLinear } from '@tanstack/charts/scales/linear'

/**
 * The product's price over time, from the periods its consumer price
 * held (Django's price spells): a stepped area chart over a range the
 * shopper picks, with the range's lowest and highest price and the
 * change over it. Rendered only for a store with `priceHistory` on and a
 * recorded price; a price that never changed is one line instead.
 *
 * No "lowest of the last 30 days": the struck-through price beside the
 * buy button already names the prior price the EU Omnibus rule requires
 * (the lowest of the 30 days BEFORE the reduction began), and a rolling
 * 30-day figure here would contradict it on the same page.
 */

const props = defineProps<{
  productId: number
  productName: string
}>()

const { t } = useI18n()
const { formatPrice } = usePriceFormat()
const { dateLocale } = useDateLocale()
const enabled = useStoreFeature('priceHistory')

const { data: history } = useLazyApi(`/api/products/${props.productId}/price-history`, {
  key: `product-price-history-${props.productId}`,
  enabled,
})

/** Shown ticks on the time axis. */
const TIME_TICKS = 6
const DAY_MS = 24 * 60 * 60 * 1000
/**
 * The store's accent: the platform's primary is neutral, which in dark
 * mode is white, while every store sets its own accent.
 */
const TREND_COLOR = 'var(--ui-secondary)'

const headingId = useId()
const gradientId = `price-trend-${useId()}`
// The moment the page reads the history: one value for the server
// render and the hydration, so both draw the same window.
const now = useState(`price-trend-now-${props.productId}`, () => Date.now())

const ranges = computed(() => history.value ? priceTrendRanges(history.value.spells, now.value) : [])
const range = ref<PriceTrendRange>('all')
watch(ranges, (available) => {
  if (!available.includes(range.value)) range.value = available[0] ?? 'all'
}, { immediate: true })

const trend = computed(() => history.value ? priceTrend(history.value.spells, range.value, now.value) : null)
const unchanged = computed(() => trend.value !== null && ranges.value.length <= 1 && trend.value.changes === 0)

const rangeItems = computed<TabsItem[]>(() => ranges.value.map(value => ({ label: t(`ranges.${value}`), value })))

const dayFormat = computed(() => new Intl.DateTimeFormat(dateLocale.value, { day: 'numeric', month: 'short' }))
const monthFormat = computed(() => new Intl.DateTimeFormat(dateLocale.value, { month: 'short', year: '2-digit' }))
const fullDateFormat = computed(() => new Intl.DateTimeFormat(dateLocale.value, { day: 'numeric', month: 'long', year: 'numeric' }))

const percentFormat = computed(() => new Intl.NumberFormat(dateLocale.value, {
  style: 'percent',
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
}))

const changeColor = computed(() => {
  const change = trend.value?.change ?? 0
  if (change < 0) return 'success' as const
  if (change > 0) return 'error' as const
  return 'neutral' as const
})

const stats = computed(() => {
  const value = trend.value
  if (!value) return []
  return [
    { key: 'lowest', label: t('stats.lowest'), value: formatPrice(value.lowest) },
    { key: 'highest', label: t('stats.highest'), value: formatPrice(value.highest) },
  ]
})

const definition = computed(() => {
  const value = trend.value
  if (!value) return undefined

  // The axis starts just under the lowest price, not at zero: a 20% drop
  // on a 0-based axis reads as a flat line. The area fills down to that
  // floor, and the domain is set explicitly because the area is
  // decorative and so does not size the scale.
  const spread = value.highest - value.lowest
  const padding = Math.max(spread * 0.5, value.highest * 0.04)
  const floor = Math.max(0, value.lowest - padding)
  const ceiling = value.highest + padding * 0.5
  const rows = value.points.map(point => ({ ...point, floor }))
  const last = rows.at(-1)!

  // Day-aligned ticks, evenly spread over the window.
  const days = Math.max(1, Math.round((value.end - value.start) / DAY_MS))
  const tickStep = Math.max(1, Math.round(days / (TIME_TICKS - 1)))
  const ticks: number[] = []
  for (let day = 0; day <= days; day += tickStep) ticks.push(value.start + day * DAY_MS)
  const tickFormat = days > 400 ? monthFormat.value : dayFormat.value

  return defineChart({
    marks: [
      decorative(areaY(rows, {
        x: 'time',
        y1: 'floor',
        y2: 'price',
        fill: `url(#${gradientId})`,
        fillOpacity: 1,
      })),
      lineY(rows, { x: 'time', y: 'price', stroke: TREND_COLOR, strokeWidth: 2 }),
      decorative(dot([last], { x: 'time', y: 'price', r: 4, fill: TREND_COLOR, stroke: 'var(--ui-bg)', strokeWidth: 2 })),
      crosshair({ x: true, y: false }),
    ],
    scales: {
      x: {
        scale: () => scaleLinear().domain([value.start, value.end]),
        axis: {
          ticks: { values: ticks, format: (time: number) => tickFormat.format(time) },
        },
      },
      y: {
        scale: () => scaleLinear().domain([floor, ceiling]),
        nice: true,
        grid: true,
        axis: { ticks: { count: 4, format: (price: number) => formatPrice(price) } },
      },
    },
    gradients: [{
      id: gradientId,
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 1,
      stops: [
        { offset: 0, color: TREND_COLOR, opacity: 0.32 },
        { offset: 1, color: TREND_COLOR, opacity: 0.02 },
      ],
    }],
    focus: 'group-x',
    maxFocusDistance: Number.POSITIVE_INFINITY,
  })
})

const ariaDescription = computed(() => {
  const value = trend.value
  if (!value) return ''
  return t('aria_description', {
    from: fullDateFormat.value.format(value.start),
    lowest: formatPrice(value.lowest),
    highest: formatPrice(value.highest),
    current: formatPrice(value.current),
  })
})

function pointOf(points: readonly { datum: unknown }[]): PriceTrendPoint | undefined {
  return points[0]?.datum as PriceTrendPoint | undefined
}
</script>

<template>
  <PageSectionBand
    v-if="enabled && trend"
    surface="default"
  >
    <section
      id="price-history"
      :aria-labelledby="headingId"
      class="@container scroll-mt-24"
    >
      <div
        class="
          flex flex-col gap-4
          @2xl:flex-row @2xl:items-end @2xl:justify-between
        "
      >
        <div class="flex flex-col gap-1">
          <h2
            :id="headingId"
            class="
              font-display text-[1.625rem] font-bold tracking-[-0.02em]
              text-highlighted
              @3xl:text-[2rem]
            "
          >
            {{ t('title') }}
          </h2>
          <p class="text-sm text-muted">
            {{ t('since', { date: fullDateFormat.format(trend.currentSince), price: formatPrice(trend.current) }) }}
          </p>
        </div>
        <UTabs
          v-if="rangeItems.length > 1"
          v-model="range"
          :items="rangeItems"
          :content="false"
          variant="pill"
          size="sm"
          color="neutral"
          :aria-label="t('range_label')"
          class="w-full @2xl:w-auto"
        />
      </div>

      <p
        v-if="unchanged"
        class="mt-6 text-base text-default"
      >
        {{ t('unchanged', { date: fullDateFormat.format(trend.currentSince) }) }}
      </p>

      <template v-else>
        <dl
          class="
            mt-6 grid grid-cols-2 gap-3
            @3xl:grid-cols-3
          "
        >
          <div class="rounded-lg bg-elevated/60 px-4 py-3">
            <dt class="text-xs font-medium text-muted">
              {{ t('stats.change') }}
            </dt>
            <dd class="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span class="text-lg font-semibold text-highlighted tabular-nums">
                {{ trend.change === 0 ? formatPrice(0) : `${trend.change > 0 ? '+' : '−'}${formatPrice(Math.abs(trend.change))}` }}
              </span>
              <UBadge
                :color="changeColor"
                variant="subtle"
                size="sm"
                :label="percentFormat.format(trend.changeRatio)"
                class="tabular-nums"
              />
            </dd>
          </div>
          <div
            v-for="stat in stats"
            :key="stat.key"
            class="rounded-lg bg-elevated/60 px-4 py-3"
          >
            <dt class="text-xs font-medium text-muted">
              {{ stat.label }}
            </dt>
            <dd class="mt-1 text-lg font-semibold text-highlighted tabular-nums">
              {{ stat.value }}
            </dd>
          </div>
        </dl>

        <UChart
          v-if="definition"
          :definition="definition"
          :aspect-ratio="2.6"
          :aria-label="t('aria_label', { product: productName })"
          :aria-description="ariaDescription"
          class="mt-6"
        >
          <template #tooltip="{ points }">
            <template v-if="pointOf(points)">
              <p class="font-medium text-highlighted">
                {{ fullDateFormat.format(pointOf(points)!.time) }}
              </p>
              <p class="text-highlighted tabular-nums">
                {{ formatPrice(pointOf(points)!.price) }}
              </p>
            </template>
          </template>
        </UChart>
      </template>
    </section>
  </PageSectionBand>
</template>

<i18n lang="yaml">
el:
  title: Εξέλιξη τιμής
  since: '{price} από {date}'
  unchanged: Η τιμή δεν έχει αλλάξει από {date}.
  range_label: Χρονικό διάστημα
  ranges:
    1m: 1 μήνας
    3m: 3 μήνες
    6m: 6 μήνες
    1y: 1 έτος
    all: Όλα
  stats:
    change: Μεταβολή
    lowest: Χαμηλότερη
    highest: Υψηλότερη
  aria_label: Εξέλιξη τιμής για {product}
  aria_description: Από {from}, χαμηλότερη τιμή {lowest}, υψηλότερη {highest}, τρέχουσα {current}.
en:
  title: Price history
  since: '{price} since {date}'
  unchanged: The price has not changed since {date}.
  range_label: Time range
  ranges:
    1m: 1 month
    3m: 3 months
    6m: 6 months
    1y: 1 year
    all: All
  stats:
    change: Change
    lowest: Lowest
    highest: Highest
  aria_label: Price history of {product}
  aria_description: Since {from}, lowest {lowest}, highest {highest}, now {current}.
</i18n>
