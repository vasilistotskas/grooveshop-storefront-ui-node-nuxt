import { H3Event } from 'h3'
import { ZodSession } from '~/types/auth/session'
import { parseDataAs } from '~/types/parser'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const cookie = event.node.req.headers.cookie
	const response = await $fetch(`${config.public.apiBaseUrl}/session/`, {
		headers: {
			Cookie: cookie || ''
		}
	})
	return await parseDataAs(response, ZodSession)
})
