import { H3Event } from 'h3'
import { ZodSession } from '~/types/auth/session'
import { parseDataAs } from '~/types/parser'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const response = await $api(`${config.public.apiBaseUrl}/session/`, event)
	return await parseDataAs(response, ZodSession)
})
