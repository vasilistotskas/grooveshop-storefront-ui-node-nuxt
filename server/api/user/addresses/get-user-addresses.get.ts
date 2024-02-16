import type { H3Event } from 'h3'
import { ZodPagination } from '~/types/pagination'
import { buildFullUrl } from '~/utils/api'

import { ZodUserAddress, ZodUserAddressQuery } from '~/types/user/address'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const query = parseQueryAs(event, ZodUserAddressQuery)
	const url = buildFullUrl(
		`${config.public.apiBaseUrl}/user/address/get_user_addresses`,
		query
	)
	const response = await $api(url, event)
	return await parseDataAs(response, ZodPagination(ZodUserAddress))
})
