/**
 * ACS address-validation proxy.
 *
 * Forwards a free-text address to Django, which calls
 * ``ACS_Address_Validation`` and caches results for 1 hour.  The
 * checkout Step 0 uses this with a debounced watcher to surface a
 * "did you mean ..." suggestion under the street + zipcode inputs.
 */
import * as z from 'zod'

const zAddressValidationBody = z.object({
  address: z.string().min(3).max(500),
  addressId: z.string().optional(),
  language: z.string().length(2).optional(),
})

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  // ``createHeaders`` is the server-side helper for outgoing Django
  // calls — sets X-Forwarded-Host (cluster ALLOWED_HOSTS), X-Real-IP,
  // X-Language, etc.  We don't need auth tokens here (the address
  // validation endpoint is public on the Django side), so we pass no
  // session/access token.  ``useRequestHeaders`` is a Nuxt app-side
  // composable and crashes here.
  const headers = createHeaders()

  try {
    const body = await readValidatedBody(event, zAddressValidationBody.parse)

    const response = await $fetch<{
      geoId?: number | null
      resolvedStreet: string
      resolvedStreetNum: string
      resolvedZip: string
      resolvedArea: string
      resolvedLong?: number | null
      resolvedLat?: number | null
      resolvedStationId: string
      resolvedBranchId?: number | null
      resolvedProvidence: string
      addressId: string
    }>(`${config.apiBaseUrl}/shipping/acs/address-validation`, {
      method: 'POST',
      body,
      headers,
    })

    return response
  }
  catch (error) {
    await handleError(error)
  }
})
