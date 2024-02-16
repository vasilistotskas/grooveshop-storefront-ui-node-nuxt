import type { H3Event } from 'h3'

import { ZodUserAddress, ZodUserAddressCreateBody } from '~/types/user/address'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const body = await parseBodyAs(event, ZodUserAddressCreateBody)
	const response = await $api(`${config.public.apiBaseUrl}/user/address`, event, {
		body
	})
	return await parseDataAs(response, ZodUserAddress)
})
