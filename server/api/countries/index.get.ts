import type { H3Event } from 'h3'
import { ZodPagination } from '~/types/pagination'
import { buildFullUrl } from '~/utils/api'

import { ZodCountriesQuery, ZodCountry } from '~/types/country'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const query = parseQueryAs(event, ZodCountriesQuery)
	const url = buildFullUrl(`${config.public.apiBaseUrl}/country`, query)
	const response = await $api(url, event)
	return await parseDataAs(response, ZodPagination(ZodCountry))
})
