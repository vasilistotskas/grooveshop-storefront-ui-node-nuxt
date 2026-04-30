/**
 * Bulk locker-catalogue endpoint, used by the carrier-aware map
 * view in the checkout. Returns every active locker for the
 * supplied country in one normalised array — the caller (the
 * Leaflet map component) doesn't paginate or know about
 * provider-specific shapes.
 *
 * Cache: 1 hour SWR via ``defineCachedEventHandler``. The Django
 * sync_acs_stations beat task refreshes the underlying rows once a
 * day, so customers picking a locker get a snapshot at most an
 * hour stale — perfectly acceptable for a 167-row fixture in
 * Athens that almost never changes.
 *
 * Provider routing: we expose this endpoint at
 * ``/api/shipping/lockers/<code>`` and switch on the path segment
 * so each carrier owns its own bulk-fetch contract upstream. Today
 * only ``acs`` is wired (BoxNow's iframe hides the catalogue from
 * us); adding ``elta`` / ``speedex`` / ``geniki`` later means
 * extending the ``PROVIDER_FETCHERS`` table by one entry.
 */
import * as z from 'zod'

const zQuery = z.object({
  country: z.string().length(2).optional(),
})

interface AcsStationDjangoRow {
  id: number
  external_id: string
  branch_code: string
  shop_kind: number
  name: string
  address_line_1: string
  city: string
  postal_code: string
  country_code: string
  lat: string | number | null
  lng: string | number | null
  working_hours: string
  max_weight_kg: string | number | null
  is_active: boolean
}

interface PaginatedDjangoResponse<T> {
  results: T[]
  count: number
  total_pages: number
  page: number
  page_size: number
}

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

function _normalize(row: AcsStationDjangoRow): NormalisedLocker {
  return {
    externalId: row.external_id,
    branchCode: row.branch_code || null,
    shopKind: row.shop_kind,
    name: row.name,
    addressLine1: row.address_line_1,
    city: row.city,
    postalCode: row.postal_code,
    countryCode: row.country_code,
    lat: _toNumber(row.lat),
    lng: _toNumber(row.lng),
    workingHours: row.working_hours || null,
    maxWeightKg: _toNumber(row.max_weight_kg),
  }
}

async function _fetchAcsStations(
  apiBaseUrl: string,
  headers: Record<string, string>,
  country: string | undefined,
): Promise<NormalisedLocker[]> {
  const collected: NormalisedLocker[] = []
  let page = 1
  // Hard cap to prevent unbounded paging if Django returns garbage —
  // 167 stations / 100 page_size = 2 pages today; we still allow up
  // to 10 pages (= 1000 lockers) of headroom for future expansion.
  const maxPages = 10
  while (page <= maxPages) {
    const response = await $fetch<PaginatedDjangoResponse<AcsStationDjangoRow>>(
      `${apiBaseUrl}/shipping/acs/stations`,
      {
        method: 'GET',
        query: {
          page,
          pageSize: 100,
          countryCode: country,
        },
        headers,
      },
    )
    for (const row of response.results ?? []) {
      collected.push(_normalize(row))
    }
    if (page >= (response.total_pages ?? 1)) break
    page += 1
  }
  return collected
}

const PROVIDER_FETCHERS: Record<
  string,
  (
    apiBaseUrl: string,
    headers: Record<string, string>,
    country: string | undefined,
  ) => Promise<NormalisedLocker[]>
> = {
  acs: _fetchAcsStations,
  // Future providers slot in here. ``boxnow`` deliberately omitted —
  // its iframe widget owns the catalogue.
}

export default defineCachedEventHandler(
  async (event) => {
    const provider = getRouterParam(event, 'provider')?.toLowerCase()
    if (!provider || !(provider in PROVIDER_FETCHERS)) {
      throw createError({
        statusCode: 404,
        statusMessage: `No bulk-locker fetcher registered for provider '${provider ?? ''}'`,
      })
    }
    const config = useRuntimeConfig()
    const headers = createHeaders()
    try {
      const query = await getValidatedQuery(event, zQuery.parse)
      const fetcher = PROVIDER_FETCHERS[provider]!
      return await fetcher(
        config.apiBaseUrl,
        headers,
        query.country?.toUpperCase(),
      )
    }
    catch (error) {
      await handleError(error)
    }
  },
  {
    maxAge: 60 * 60, // 1h fresh
    staleMaxAge: 60 * 60 * 6, // up to 6h stale-while-revalidate
    name: 'shipping.lockers',
    getKey: (event) => {
      const provider = getRouterParam(event, 'provider') ?? 'unknown'
      const url = new URL(event.node.req.url ?? '/', 'http://internal')
      const country = url.searchParams.get('country') ?? 'all'
      return `${provider}:${country.toUpperCase()}`
    },
  },
)
