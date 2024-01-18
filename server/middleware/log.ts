export default defineEventHandler((event) => {
	const requestUrl = getRequestURL(event)

	if (process.env.NODE_ENV !== 'production') {
		console.info(`New request: ${requestUrl}`)
	}
})
