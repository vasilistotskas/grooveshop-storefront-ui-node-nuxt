import { H3Event } from 'h3'
import { parseBodyAs, parseDataAs, parseParamsAs } from '~/types/parser'
import { ZodAccount, ZodAccountParams, ZodAccountPutRequest } from '~/types/user/account'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const body = await parseBodyAs(event, ZodAccountPutRequest)
	const params = parseParamsAs(event, ZodAccountParams)
	const response = await $api(
		`${config.public.apiBaseUrl}/user/account/${params.id}/`,
		event,
		{
			body: JSON.stringify(body)
		}
	)
	return await parseDataAs(response, ZodAccount)
})
