import type { H3Event } from 'h3'
import {
	ZodUserAccount,
	ZodUserAccountParams,
	ZodUserAccountPutBody
} from '~/types/user/account'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const body = await parseBodyAs(event, ZodUserAccountPutBody)
	const params = parseParamsAs(event, ZodUserAccountParams)
	const response = await $api(
		`${config.public.apiBaseUrl}/user/account/${params.id}`,
		event,
		{
			body
		}
	)
	return await parseDataAs(response, ZodUserAccount)
})
