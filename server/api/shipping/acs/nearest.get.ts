/**
 * Nearest-locker proxy for the ACS Smartpoint checkout picker.
 *
 * Forwards postcode + optional city to the Django nearest action,
 * which returns up to 20 active stations of kinds 7+8 (Greek
 * Smartpoint lockers).  The Nuxt picker component then renders the
 * list — no GPS, no widget, no external script.
 */
import * as z from 'zod'

const zNearestQuery = z.object({
  postalCode: z.string().min(3).max(10),
  city: z.string().optional(),
  shopKind: z.coerce.number().int().optional(),
  // ISO-2 country code; when omitted Django falls back to the
  // provider's primary country. Carriers can pass this so a
  // multi-country deployment doesn't return cross-country lockers.
  countryCode: z.string().length(2).optional(),
})

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  // Server-side header helper (handles X-Forwarded-Host etc.) — public
  // endpoint, no auth tokens needed.
  const headers = createHeaders()
  try {
    const query = await getValidatedQuery(event, zNearestQuery.parse)

    const response = await $fetch<AcsStation[]>(
      `${config.apiBaseUrl}/shipping/acs/stations/nearest`,
      {
        method: 'GET',
        query: {
          postalCode: query.postalCode,
          city: query.city,
          shopKind: query.shopKind,
          countryCode: query.countryCode,
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
