import type { H3Event } from 'h3'
import { z } from 'zod'

import { ZodUserAddressParams } from '~/types/user/address'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const session = await getUserSession(event)
	const params = await getValidatedRouterParams(event, ZodUserAddressParams.parse)
	const response = await $fetch(`${config.public.apiBaseUrl}/user/address/${params.id}`, {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${session?.token}`
		}
	})
	return await parseDataAs(response, z.any())
})
