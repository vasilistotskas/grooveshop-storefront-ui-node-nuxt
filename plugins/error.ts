export default defineNuxtPlugin((nuxtApp) => {
	nuxtApp.hook('vue:error', (..._args) => {
		if (process.env.NODE_ENV !== 'production') {
			// eslint-disable-next-line no-console
			console.error('vue:error', ..._args)
		}
	})
	nuxtApp.hook('app:error', (..._args) => {
		if (process.env.NODE_ENV !== 'production') {
			// eslint-disable-next-line no-console
			console.error('app:error', ..._args)
		}
	})
	nuxtApp.vueApp.config.errorHandler = (..._args) => {
		if (process.env.NODE_ENV !== 'production') {
			// eslint-disable-next-line no-console
			console.error('global error handler', ..._args)
		}
	}
})
