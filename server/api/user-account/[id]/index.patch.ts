import type { H3Event } from 'h3'

import { ZodAccount, ZodAccountParams } from '~/types/user/account'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const form = await readFormData(event)
	const params = parseParamsAs(event, ZodAccountParams)
	const response = await $api(
		`${config.public.apiBaseUrl}/user/account/${params.id}`,
		event,
		{
			body: form
		}
	)
	return await parseDataAs(response, ZodAccount)
})
