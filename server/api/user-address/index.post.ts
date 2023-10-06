import { H3Event } from 'h3'
import { parseBodyAs, parseDataAs } from '~/types/parser'
import { ZodAddress, ZodAddressCreateBody } from '~/types/user/address'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const body = await parseBodyAs(event, ZodAddressCreateBody)
	const response = await $api(`${config.public.apiBaseUrl}/user/address/`, event, {
		body: JSON.stringify(body)
	})
	return await parseDataAs(response, ZodAddress)
})
