import type { H3Event } from 'h3'

import { ZodPagination } from '~/types/pagination'
import { ZodUserAddress, ZodUserAddressQuery } from '~/types/user/address'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const session = await getUserSession(event)
	const query = await getValidatedQuery(event, ZodUserAddressQuery.parse)
	const url = buildFullUrl(`${config.public.apiBaseUrl}/user/address`, query)
	const response = await $fetch(url, {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${session?.token}`
		}
	})
	return await parseDataAs(response, ZodPagination(ZodUserAddress))
})
