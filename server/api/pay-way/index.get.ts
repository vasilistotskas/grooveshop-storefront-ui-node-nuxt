import type { H3Event } from 'h3'
import { ZodPagination } from '~/types/pagination'
import { buildFullUrl } from '~/utils/api'

import { ZodPayWay, ZodPayWayQuery } from '~/types/pay-way'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const query = parseQueryAs(event, ZodPayWayQuery)
	const url = buildFullUrl(`${config.public.apiBaseUrl}/pay_way`, query)
	const response = await $api(url, event)
	return await parseDataAs(response, ZodPagination(ZodPayWay))
})
