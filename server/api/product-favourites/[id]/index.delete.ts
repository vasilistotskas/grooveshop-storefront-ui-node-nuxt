import { H3Event } from 'h3'
import { z } from 'zod'
import { parseDataAs, parseParamsAs } from '~/zod/parser'
import { ZodFavouriteParams } from '~/zod/product/favourite'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const cookie = event.node.req.headers.cookie
	const params = parseParamsAs(event, ZodFavouriteParams)
	const csrftoken = getCookie(event, 'csrftoken') || ''

	const response = await $fetch(
		`${config.public.apiBaseUrl}/product/favourite/${params.id}/`,
		{
			headers: {
				Cookie: cookie || '',
				'X-CSRFToken': csrftoken,
				'Content-Type': 'application/json',
				method: 'delete'
			},
			method: 'delete'
		}
	)
	return await parseDataAs(response, z.any())
})
