import { useLogger } from '@nuxt/kit'

export default defineEventHandler((event) => {
	const requestUrl = getRequestURL(event)
	const logger = useLogger()

	if (process.env.NODE_ENV !== 'production') {
		logger.info(`New request: ${requestUrl}`)
	}
})
