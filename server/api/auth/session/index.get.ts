import type { H3Event } from 'h3'
import { z } from 'zod'

import type { Session } from '~/types/auth'

export const ZodSession = z.object({
	isSessionAuthenticated: z.boolean(),
	CSRFToken: z.string().min(1),
	referer: z.string().nullish(),
	userAgent: z.string(),
	sessionid: z.string(),
	role: z.string(),
	lastActivity: z.string().nullish()
}) satisfies z.ZodType<Session>

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	try {
		const response = await $api(`${config.public.apiBaseUrl}/auth/session`, event, {
			method: 'GET'
		})
		const session = await parseDataAs(response, ZodSession)

		setSessionIdCookie(event, session.sessionid)
		setCsrftokenCookie(event, session.CSRFToken)

		event.context.sessionid = session.sessionid
		event.context.csrftoken = session.CSRFToken
		return session
	} catch (error) {
		deleteSessionIdCookie(event)
		deleteCsrftokenCookie(event)
		await handleError(error)
	}
})
