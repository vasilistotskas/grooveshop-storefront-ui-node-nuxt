import type { H3Event } from 'h3'
import { z } from 'zod'

import { ZodCartItemParams } from '~/types/cart/cart-item'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const params = parseParamsAs(event, ZodCartItemParams)

	const response = await $api(`${config.public.apiBaseUrl}/cart/item/${params.id}`, event)
	return await parseDataAs(response, z.any())
})
