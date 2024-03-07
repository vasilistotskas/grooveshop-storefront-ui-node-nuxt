import type { H3Event } from 'h3'

import {
	ZodUserAccountDetails,
	ZodUserAccountDetailsParams,
	ZodUserAccountDetailsQuery
} from '~/types/user/account/details'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const session = await requireUserSession(event)
	const params = await getValidatedRouterParams(event, ZodUserAccountDetailsParams.parse)
	const query = await getValidatedQuery(event, ZodUserAccountDetailsQuery.parse)
	const url = buildFullUrl(
		`${config.public.apiBaseUrl}/user/account/${params.id}/details`,
		query
	)
	try {
		const response = await $fetch(url, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${session?.token}`
			}
		})
		return await parseDataAs(response, ZodUserAccountDetails)
	} catch (error) {
		await handleError(error)
	}
})
