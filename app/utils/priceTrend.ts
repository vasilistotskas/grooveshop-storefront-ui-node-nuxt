/**
 * A product's price over time, shaped for the product page's price
 * trend from Django's price spells (one row per period the consumer
 * price held, oldest first; `validTo` null for the price in force).
 */

export type PriceTrendRange = '1m' | '3m' | '6m' | '1y' | 'all'

/** The ranges the page offers, shortest first. */
export const PRICE_TREND_RANGES: readonly PriceTrendRange[] = ['1m', '3m', '6m', '1y', 'all']

const DAY_MS = 24 * 60 * 60 * 1000

const RANGE_DAYS: Record<Exclude<PriceTrendRange, 'all'>, number> = {
  '1m': 30,
  '3m': 91,
  '6m': 182,
  '1y': 365,
}

/** The Omnibus window: the lowest price of the last 30 days. */
const REFERENCE_DAYS = 30

/** Above this many days, the curve is sampled weekly instead of daily. */
const DAILY_SAMPLES_MAX = 400

export interface PriceTrendPoint {
  /** Epoch milliseconds. */
  time: number
  price: number
}

export interface PriceTrend {
  points: PriceTrendPoint[]
  /** Epoch milliseconds the plotted window starts and ends at. */
  start: number
  end: number
  current: number
  lowest: number
  highest: number
  /** Current price minus the price at the window's start. */
  change: number
  /** `change` as a fraction of the start price, `0` when the start was `0`. */
  changeRatio: number
  /** The lowest price of the last 30 days (EU Omnibus reference). */
  lowestLast30Days: number
  /** How many times the price changed inside the window. */
  changes: number
  /** When the price in force began. */
  currentSince: number
}

interface Spell { from: number, to: number, price: number }

/**
 * The spells as time spans, oldest first. Back-to-back spells at one
 * price are one period: a spell is recorded whenever the price is
 * re-evaluated, and a shopper sees no change there.
 */
function spellsOf(spells: readonly ProductPriceSpell[], now: number): Spell[] {
  const spans = spells
    .map(spell => ({
      from: Date.parse(spell.validFrom),
      to: spell.validTo ? Date.parse(spell.validTo) : now,
      price: spell.price,
    }))
    .filter(spell => spell.from < now && spell.to > spell.from)
    .sort((a, b) => a.from - b.from)
  const merged: Spell[] = []
  for (const span of spans) {
    const last = merged.at(-1)
    if (last && last.price === span.price && last.to >= span.from) last.to = Math.max(last.to, span.to)
    else merged.push({ ...span })
  }
  return merged
}

function priceAt(spells: readonly Spell[], time: number): number | undefined {
  return spells.find(spell => spell.from <= time && time < spell.to)?.price
    ?? (time >= spells.at(-1)!.to ? spells.at(-1)!.price : undefined)
}

/**
 * The ranges worth offering: those that cut into the history (a range
 * reaching before the first recorded price shows the same as "all"),
 * then "all". Only "all" for a history shorter than a month.
 */
export function priceTrendRanges(spells: readonly ProductPriceSpell[], now: number): PriceTrendRange[] {
  const first = spellsOf(spells, now)[0]
  if (!first) return []
  return PRICE_TREND_RANGES.filter(range =>
    range === 'all' || now - RANGE_DAYS[range] * DAY_MS > first.from)
}

/**
 * The price trend over a range, or `null` without any recorded price.
 *
 * A price change is drawn as a step at the moment it happened: two
 * points at that instant, the old price then the new one. Between
 * changes the curve carries a sample per day (per week for histories
 * longer than `DAILY_SAMPLES_MAX` days) so the pointer finds a date
 * wherever it rests.
 */
export function priceTrend(
  spells: readonly ProductPriceSpell[],
  range: PriceTrendRange,
  now: number,
): PriceTrend | null {
  const all = spellsOf(spells, now)
  const first = all[0]
  if (!first) return null

  const start = range === 'all'
    ? first.from
    : Math.max(first.from, now - RANGE_DAYS[range] * DAY_MS)
  const inWindow = all.filter(spell => spell.to > start)

  const days = (now - start) / DAY_MS
  const step = days > DAILY_SAMPLES_MAX ? 7 * DAY_MS : DAY_MS
  const times = new Set<number>([start, now])
  for (let time = start + step; time < now; time += step) times.add(time)

  // Each change inside the window as a step at its instant, which a
  // sample landing on that instant would only duplicate.
  const changesInWindow = inWindow.filter(spell => spell.from > start)
  for (const spell of changesInWindow) times.delete(spell.from)

  const points: PriceTrendPoint[] = []
  for (const time of [...times].sort((a, b) => a - b)) {
    const price = priceAt(inWindow, time)
    if (price !== undefined) points.push({ time, price })
  }
  for (const spell of changesInWindow) {
    const before = priceAt(inWindow, spell.from - 1)
    if (before !== undefined) points.push({ time: spell.from, price: before })
    points.push({ time: spell.from, price: spell.price })
  }
  // Stable for equal times: the price before a change sorts first.
  points.sort((a, b) => a.time - b.time)

  const prices = inWindow.map(spell => spell.price)
  const current = all.at(-1)!.price
  const startPrice = priceAt(inWindow, start) ?? current
  const reference = all.filter(spell => spell.to > now - REFERENCE_DAYS * DAY_MS)

  return {
    points,
    start,
    end: now,
    current,
    lowest: Math.min(...prices),
    highest: Math.max(...prices),
    change: current - startPrice,
    changeRatio: startPrice === 0 ? 0 : (current - startPrice) / startPrice,
    lowestLast30Days: Math.min(...reference.map(spell => spell.price)),
    changes: changesInWindow.length,
    currentSince: all.at(-1)!.from,
  }
}
