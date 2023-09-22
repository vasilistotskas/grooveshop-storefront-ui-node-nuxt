import { H3Event } from 'h3'
import { z } from 'zod'
import { ZodAddressParams } from '~/types/user/address'
import { parseDataAs, parseParamsAs } from '~/types/parser'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const params = parseParamsAs(event, ZodAddressParams)
	const response = await $api(
		`${config.public.apiBaseUrl}/user/address/${params.id}/set_main/`,
		event
	)
	return await parseDataAs(response, z.any())
})
