import type { H3Event } from 'h3'

import { ZodCountriesQuery, ZodCountry } from '~/types/country'
import { ZodPagination } from '~/types/pagination'
import { buildFullUrl } from '~/utils/api'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const query = await getValidatedQuery(event, ZodCountriesQuery.parse)
	const url = buildFullUrl(`${config.public.apiBaseUrl}/country`, query)
	const response = await $fetch(url, {
		method: 'GET'
	})
	return await parseDataAs(response, ZodPagination(ZodCountry))
})
