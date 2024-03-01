import type { H3Event } from 'h3'

import { ZodPagination } from '~/types/pagination'
import { ZodPayWay, ZodPayWayQuery } from '~/types/pay-way'
import { buildFullUrl } from '~/utils/api'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const query = await getValidatedQuery(event, ZodPayWayQuery.parse)
	const url = buildFullUrl(`${config.public.apiBaseUrl}/pay_way`, query)
	const response = await $fetch(url, {
		method: 'GET'
	})
	return await parseDataAs(response, ZodPagination(ZodPayWay))
})
