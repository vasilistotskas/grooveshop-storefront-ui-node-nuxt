/**
 * Paginated station list proxy.
 *
 * Used by the picker for browse-by-area when the user clears the
 * postcode field and explores stations directly.  The Django list
 * action defaults to lockers (kinds 7+8); pass ``shopKind=1`` etc to
 * surface other kinds.
 */
import * as z from 'zod'

const zStationsQuery = z.object({
  postalCode: z.string().optional(),
  countryCode: z.string().length(2).optional(),
  shopKind: z.coerce.number().int().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
})

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  // Server-side header helper (handles X-Forwarded-Host etc.) — public
  // endpoint, no auth tokens needed.
  const headers = createHeaders()
  try {
    const query = await getValidatedQuery(event, zStationsQuery.parse)

    const response = await $fetch<PaginatedAcsStationList>(
      `${config.apiBaseUrl}/shipping/acs/stations`,
      {
        method: 'GET',
        query: {
          postalCode: query.postalCode,
          countryCode: query.countryCode,
          shopKind: query.shopKind,
          search: query.search,
          page: query.page,
          pageSize: query.pageSize,
        },
        headers,
      },
    )

    return response
  }
  catch (error) {
    await handleError(error)
  }
})
