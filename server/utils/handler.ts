import type { EventHandler, EventHandlerRequest } from 'h3'

export const defineWrappedResponseHandler = <T extends EventHandlerRequest, D>(
	handler: EventHandler<T, D>
): EventHandler<T, D> =>
	defineEventHandler<T>(async (event) => {
		const jwtAuth = getCookie(event, 'jwt-auth') || ''

		if (jwtAuth) {
			appendResponseHeader(event, 'Authorization', 'Bearer ' + jwtAuth)
		}

		try {
			// do something before the route handler
			const response = await handler(event)
			// do something after the route handler
			return response
		} catch (error) {
			await handleError(error)
		}
	})
