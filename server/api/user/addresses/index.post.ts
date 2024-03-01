import type { H3Event } from 'h3'

import { ZodUserAddress, ZodUserAddressCreateBody } from '~/types/user/address'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const session = await getUserSession(event)
	const body = await readValidatedBody(event, ZodUserAddressCreateBody.parse)
	const response = await $fetch(`${config.public.apiBaseUrl}/user/address`, {
		method: 'POST',
		body,
		headers: {
			Authorization: `Bearer ${session?.token}`
		}
	})
	return await parseDataAs(response, ZodUserAddress)
})
