import type { H3Event } from 'h3'
import {
	ZodUserAddress,
	ZodUserAddressParams,
	ZodUserAddressPutBody
} from '~/types/user/address'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const body = await parseBodyAs(event, ZodUserAddressPutBody)
	const params = parseParamsAs(event, ZodUserAddressParams)
	const response = await $api(
		`${config.public.apiBaseUrl}/user/address/${params.id}`,
		event,
		{
			body
		}
	)
	return await parseDataAs(response, ZodUserAddress)
})
