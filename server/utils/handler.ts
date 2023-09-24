import type { EventHandler, EventHandlerRequest } from 'h3'
import { handleError } from '~/server/utils/error'

export const defineWrappedResponseHandler = <T extends EventHandlerRequest, D>(
	handler: EventHandler<T, D>
): EventHandler<T, D> =>
	defineEventHandler<T>(async (event) => {
		const csrftoken = getCookie(event, 'csrftoken') || ''
		const sessionId = getCookie(event, 'sessionid') || ''
		const jwtRefreshAuth = getCookie(event, 'jwt-refresh-auth') || ''
		const jwtAuth = getCookie(event, 'jwt-auth') || ''

		appendResponseHeader(event, 'X-CSRFToken', csrftoken)
		appendResponseHeader(event, 'sessionid', sessionId)
		appendResponseHeader(event, 'jwt-refresh-auth', jwtRefreshAuth)
		appendResponseHeader(event, 'jwt-auth', jwtAuth)

		try {
			// do something before the route handler
			const response = await handler(event)
			// do something after the route handler
			return response
		} catch (error) {
			await handleError(error)
		}
	})
