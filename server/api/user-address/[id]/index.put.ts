import type { H3Event } from 'h3'
import { ZodAddress, ZodAddressParams, ZodAddressPutBody } from '~/types/user/address'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const body = await parseBodyAs(event, ZodAddressPutBody)
	const params = parseParamsAs(event, ZodAddressParams)
	const response = await $api(
		`${config.public.apiBaseUrl}/user/address/${params.id}`,
		event,
		{
			body: JSON.stringify(body)
		}
	)
	return await parseDataAs(response, ZodAddress)
})
