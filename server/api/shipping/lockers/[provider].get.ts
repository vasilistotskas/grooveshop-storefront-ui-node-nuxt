/**
 * Bulk locker-catalogue endpoint, used by the carrier-aware map
 * view in the checkout. Returns every active locker for the
 * supplied country in one normalised array — the caller (the
 * checkout's map component) doesn't paginate or know about
 * provider-specific shapes.
 *
 * Cache: 1 hour SWR via ``defineCachedRoute``. The Django
 * sync_acs_stations beat task refreshes the underlying rows once a
 * day, so customers picking a locker get a snapshot at most an
 * hour stale. ACS has 1,576 stations in Greece (2026-10-14), 16
 * pages of 100.
 *
 * Provider routing: we expose this endpoint at
 * ``/api/shipping/lockers/<code>`` and switch on the path segment
 * so each carrier owns its own bulk-fetch contract upstream. Today
 * only ``acs`` is wired (BoxNow's iframe hides the catalogue from
 * us); adding ``elta`` / ``speedex`` / ``geniki`` later means
 * extending the ``PROVIDER_FETCHERS`` table by one entry.
 */
import type { $Fetch } from 'ofetch'
import * as z from 'zod'
import { createError, getRouterParam, getValidatedQuery, useRuntimeConfig } from 'nuxt/server'

const zQuery = z.object({
  country: z.string().length(2).optional(),
})

/** The largest page Django's API serves (`max_page_size`). */
const STATIONS_PAGE_SIZE = 100

interface NormalisedLocker {
  externalId: string
  branchCode: string | null
  shopKind: number
  name: string
  addressLine1: string
  city: string
  postalCode: string
  countryCode: string
  lat: number | null
  lng: number | null
  workingHours: string | null
  maxWeightKg: number | null
}

function _toNumber(
  value: string | number | null | undefined,
): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : Number.parseFloat(value)
  return Number.isFinite(n) ? n : null
}

function _normalize(row: AcsStation): NormalisedLocker {
  return {
    externalId: row.externalId,
    branchCode: row.branchCode || null,
    shopKind: row.shopKind,
    name: row.name,
    addressLine1: row.addressLine1,
    city: row.city,
    postalCode: row.postalCode,
    countryCode: row.countryCode,
    lat: _toNumber(row.lat),
    lng: _toNumber(row.lng),
    workingHours: row.workingHours || null,
    maxWeightKg: _toNumber(row.maxWeightKg),
  }
}

async function _fetchAcsStations(
  backendFetch: $Fetch,
  apiBaseUrl: string,
  headers: Record<string, string>,
  country: string | undefined,
): Promise<NormalisedLocker[]> {
  const collected: NormalisedLocker[] = []
  // The walk ends on the page Django names as the last, or on the first
  // page that is not full, whichever comes first: a `totalPages` that
  // cannot be right then cannot make it endless. A fixed page cap used to
  // do that job and cut the map at 1,000 of ACS's 1,576 Greek stations.
  for (let page = 1; ; page += 1) {
    const raw = await backendFetch(
      `${apiBaseUrl}/shipping/acs/stations`,
      {
        method: 'GET',
        query: {
          page,
          pageSize: STATIONS_PAGE_SIZE,
          countryCode: country,
        },
        headers,
      },
    )
    // Runtime-validate each page with the generated paginated schema —
    // the previous bare TS generic let upstream shape drift through.
    const response = await parseDataAs(raw, zPaginatedAcsStationList)
    const rows = response.results ?? []
    for (const row of rows) {
      collected.push(_normalize(row))
    }
    if (page >= (response.totalPages ?? 1) || rows.length < STATIONS_PAGE_SIZE) break
  }
  return collected
}

const PROVIDER_FETCHERS: Record<
  string,
  (
    backendFetch: $Fetch,
    apiBaseUrl: string,
    headers: Record<string, string>,
    country: string | undefined,
  ) => Promise<NormalisedLocker[]>
> = {
  acs: _fetchAcsStations,
  // Future providers slot in here. ``boxnow`` deliberately omitted —
  // its iframe widget owns the catalogue.
}

export default defineCachedRoute(
  async (event) => {
    const provider = getRouterParam(event, 'provider', { decode: true })?.toLowerCase()
    if (!provider || !(provider in PROVIDER_FETCHERS)) {
      throw createError({
        status: 404,
        statusText: `No bulk-locker fetcher registered for provider '${provider ?? ''}'`,
      })
    }
    const config = useRuntimeConfig()
    const headers = createHeaders(event)
    try {
      const query = await getValidatedQuery(event, zQuery)
      const fetcher = PROVIDER_FETCHERS[provider]!
      const rows = await fetcher(
        useBackendFetch(event),
        config.apiBaseUrl,
        headers,
        query.country?.toUpperCase(),
      )
      // Empty-poison guard: an empty upstream response (e.g. Django
      // pods came up before the AcsStation table was synced) used to
      // be cached for the full 1h+6h SWR window — leaving the picker
      // map blank long after the next sync had populated rows. Throw
      // so the Nitro cache wrapper does NOT store the empty result;
      // the picker's component-level error state then redirects the
      // user to the postal-code list view, which hits the live
      // ``/nearest`` endpoint (uncached) and works.
      if (rows.length === 0) {
        throw createError({
          status: 503,
          statusText: `Bulk locker catalogue for provider '${provider}' is currently empty — refusing to cache.`,
        })
      }
      return rows
    }
    catch (error) {
      handleError(event, error)
    }
  },
  {
    maxAge: 60 * 60, // 1h fresh
    staleMaxAge: 60 * 60 * 6, // up to 6h stale-while-revalidate
    name: 'shipping.lockers',
    // Allow callers to force a fresh upstream hit via ``?refresh=1``.
    // Useful when ops needs to evict a stale empty cache from prod
    // without rolling the SSR replicas — curl the URL once and the
    // next non-bypass request fills with the fresh data.
    shouldBypassCache: (event) => {
      const url = new URL(event.node.req.url ?? '/', 'http://internal')
      return url.searchParams.get('refresh') === '1'
    },
    getKey: (event) => {
      const provider = getRouterParam(event, 'provider', { decode: true }) ?? 'unknown'
      const url = new URL(event.node.req.url ?? '/', 'http://internal')
      const country = url.searchParams.get('country') ?? 'all'
      return tenantCacheKey(event, `${provider}:${country.toUpperCase()}`)
    },
  },
)
