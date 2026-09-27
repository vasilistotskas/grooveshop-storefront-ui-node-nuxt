import type { LocationQuery } from 'vue-router'

/**
 * Remembers where this tab's visit came from — the UTM tags, which
 * ad-click ids were on the landing URL, and an external referrer — so
 * the order placed later in the same tab can carry it to Django as
 * `attribution` on `POST /order`, which classifies it into the order's
 * source.
 *
 * Only what classification needs is kept: three UTM values (trimmed,
 * length-capped), the NAMES of allow-listed click-id params (never
 * their values, which identify the click), and the referrer's origin
 * (Django keeps only its host; path and query can carry a search term
 * or a user's page). Per-tab
 * `sessionStorage`, first-party, sent nowhere but our own order call,
 * so nothing persistent is stored and no consent gate applies.
 *
 * Which visit wins, within a tab session:
 * - the tab's first page load always opens the session, even a direct
 *   one (just its landing path), and so does its referrer;
 * - afterwards only a visit with a UTM tag or a click id replaces it.
 *   A later referral is never a new landing: it is a payment
 *   provider's hosted-page return (Viva, a 3-D Secure redirect), which
 *   must not relabel the tab as a referral from the gateway — the
 *   session rule WooCommerce's order attribution applies too.
 *
 * SSR-safe: every call is a no-op on the server.
 */

const STORAGE_KEY = 'order-attribution'

/**
 * The click-id query params whose presence is recorded: exactly the
 * `ClickIdsEnum` Django's order attribution accepts. A `Record` over the
 * generated enum, so a param added or dropped on either side fails the
 * type check instead of drifting.
 */
const CLICK_ID_PARAMS: Record<ClickIdsEnum, true> = {
  gclid: true,
  gbraid: true,
  wbraid: true,
  msclkid: true,
  ttclid: true,
  twclid: true,
  li_fat_id: true,
  epik: true,
  fbclid: true,
}
export const ORDER_ATTRIBUTION_CLICK_IDS = Object.keys(CLICK_ID_PARAMS) as ClickIdsEnum[]

const UTM_CAPS = {
  utm_source: 100,
  utm_medium: 100,
  utm_campaign: 200,
} as const
const URL_CAP = 500

/**
 * The `attribution` body of `POST /order`, minus `agentProtocol`, which
 * only the agent gateway sets.
 */
export type OrderAttributionPayload = Omit<OrderAttributionInputRequest, 'agentProtocol'>

export type OrderAttributionCapture = {
  query: LocationQuery
  referrer: string
  landingPath: string
  ownOrigin: string
}

function firstString(value: LocationQuery[string] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' ? raw : undefined
}

function utmValue(query: LocationQuery, name: keyof typeof UTM_CAPS): string | undefined {
  const value = firstString(query[name])?.trim()
  return value ? value.slice(0, UTM_CAPS[name]) : undefined
}

/** The referrer's origin, or nothing when same-origin or unparsable. */
function externalReferrer(referrer: string, ownOrigin: string): string | undefined {
  if (!referrer) return undefined
  try {
    const url = new URL(referrer)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
    if (url.origin === ownOrigin) return undefined
    return url.origin
  }
  catch {
    return undefined
  }
}

function readStored(): OrderAttributionPayload | null {
  if (!import.meta.client) return null
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const entry = parsed as Record<string, unknown>
    const payload: OrderAttributionPayload = {}
    for (const key of ['utmSource', 'utmMedium', 'utmCampaign', 'referrer', 'landingPath'] as const) {
      if (typeof entry[key] === 'string' && entry[key]) payload[key] = entry[key]
    }
    if (Array.isArray(entry.clickIds)) {
      const clickIds = ORDER_ATTRIBUTION_CLICK_IDS.filter(id => (entry.clickIds as unknown[]).includes(id))
      if (clickIds.length) payload.clickIds = clickIds
    }
    return Object.keys(payload).length ? payload : null
  }
  catch {
    return null
  }
}

function writeStored(payload: OrderAttributionPayload): void {
  if (!import.meta.client) return
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }
  catch {
    // Storage blocked (private mode, quota): the order is simply
    // classified without it; checkout itself is unaffected.
  }
}

export function useOrderAttribution() {
  /** Record this visit's landing, applying the session override rule. */
  const capture = ({ query, referrer, landingPath, ownOrigin }: OrderAttributionCapture): void => {
    if (!import.meta.client) return

    const utmSource = utmValue(query, 'utm_source')
    const utmMedium = utmValue(query, 'utm_medium')
    const utmCampaign = utmValue(query, 'utm_campaign')
    const clickIds = ORDER_ATTRIBUTION_CLICK_IDS.filter(id => Boolean(firstString(query[id])?.trim()))
    const external = externalReferrer(referrer, ownOrigin)

    const isCampaign = Boolean(utmSource || utmMedium || utmCampaign || clickIds.length)
    if (!isCampaign && readStored()) return

    writeStored({
      ...(utmSource ? { utmSource } : {}),
      ...(utmMedium ? { utmMedium } : {}),
      ...(utmCampaign ? { utmCampaign } : {}),
      ...(clickIds.length ? { clickIds } : {}),
      ...(external ? { referrer: external } : {}),
      ...(landingPath ? { landingPath: landingPath.slice(0, URL_CAP) } : {}),
    })
  }

  /** The stored attribution to send with the order, or null. */
  const read = (): OrderAttributionPayload | null => readStored()

  return { capture, read }
}
