import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
	const refreshCookie = getRefreshTokenFromCookie(event)
	const auth = event.context.auth

	const storage = useStorage('storage:auth')
	if (auth && refreshCookie) {
		await storage.setItems(
			[
				{
					key: 'auth',
					value: auth
				},
				{
					key: 'refreshCookie',
					value: refreshCookie
				}
			],
			{
				storage: 'local'
			}
		)
	}

	if (!auth && refreshCookie) {
		deleteRefreshTokenCookie(event)
	}
})
