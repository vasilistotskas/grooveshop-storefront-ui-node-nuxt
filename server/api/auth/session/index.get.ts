import { H3Event } from 'h3'
import { z } from 'zod'
import { parseDataAs } from '~/types/parser'
import { Session } from '~/types/auth'

export const ZodSession = z.object({
	isSessionAuthenticated: z.boolean(),
	CSRFToken: z.string().min(1),
	referer: z.string(),
	userAgent: z.string(),
	sessionid: z.string(),
	role: z.string(),
	lastActivity: z.string()
}) satisfies z.ZodType<Session>

export const ZodRefreshTokens = z.array(ZodSession)

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	try {
		const session = await $api(`${config.public.apiBaseUrl}/auth/session/`, event, {
			method: 'GET'
		})

		const allSessions = await $api(
			`${config.public.apiBaseUrl}/auth/session/all/`,
			event,
			{
				method: 'GET'
			}
		)

		return {
			allSessions: await parseDataAs(allSessions, ZodRefreshTokens),
			session: await parseDataAs(session, ZodSession)
		}
	} catch (error) {
		await handleError(error)
	}
})
