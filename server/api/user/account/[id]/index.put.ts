import type { H3Event } from 'h3'

import {
	ZodUserAccount,
	ZodUserAccountParams,
	ZodUserAccountPutBody
} from '~/types/user/account'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const session = await getUserSession(event)
	const body = await readValidatedBody(event, ZodUserAccountPutBody.parse)
	const params = await getValidatedRouterParams(event, ZodUserAccountParams.parse)
	const response = await $fetch(`${config.public.apiBaseUrl}/user/account/${params.id}`, {
		method: 'PUT',
		body,
		headers: {
			Authorization: `Bearer ${session?.token}`
		}
	})
	return await parseDataAs(response, ZodUserAccount)
})
