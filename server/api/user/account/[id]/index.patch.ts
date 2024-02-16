import type { H3Event } from 'h3'

import { ZodUserAccount, ZodUserAccountParams } from '~/types/user/account'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const form = await readFormData(event)
	const params = parseParamsAs(event, ZodUserAccountParams)
	const response = await $api(
		`${config.public.apiBaseUrl}/user/account/${params.id}`,
		event,
		{
			body: form
		}
	)
	return await parseDataAs(response, ZodUserAccount)
})
