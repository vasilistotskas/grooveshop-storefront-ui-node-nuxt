export default defineEventHandler((event) => {
	const requestUrl = getRequestURL(event)

	if (process.env.NODE_ENV !== 'production') {
		// eslint-disable-next-line no-console
		console.info(`New request: ${requestUrl}`)
	}
})
