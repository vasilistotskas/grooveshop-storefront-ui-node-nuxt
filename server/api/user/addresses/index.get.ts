import type { H3Event } from 'h3'
import { ZodPagination } from '~/types/pagination'
import { buildFullUrl } from '~/utils/api'

import { ZodAddress, ZodAddressQuery } from '~/types/user/address'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const query = parseQueryAs(event, ZodAddressQuery)
	const url = buildFullUrl(`${config.public.apiBaseUrl}/user/address`, query)
	const response = await $api(url, event)
	return await parseDataAs(response, ZodPagination(ZodAddress))
})
