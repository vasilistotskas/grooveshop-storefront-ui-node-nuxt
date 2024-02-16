import type { H3Event } from 'h3'
import { z } from 'zod'

import { ZodUserAddressParams } from '~/types/user/address'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const params = parseParamsAs(event, ZodUserAddressParams)
	const response = await $api(
		`${config.public.apiBaseUrl}/user/address/${params.id}`,
		event
	)
	return await parseDataAs(response, z.any())
})
