export default defineNuxtPlugin((nuxtApp) => {
	nuxtApp.hook('vue:error', (..._args) => {
		if (process.env.NODE_ENV !== 'production') {
			// eslint-disable-next-line no-console
			console.log('============= vue:error =============', ..._args)
		}
	})
	nuxtApp.hook('app:error', (..._args) => {
		if (process.env.NODE_ENV !== 'production') {
			// eslint-disable-next-line no-console
			console.log('============= app:error =============', ..._args)
		}
	})
	nuxtApp.vueApp.config.errorHandler = (..._args) => {
		if (process.env.NODE_ENV !== 'production') {
			// eslint-disable-next-line no-console
			console.log('============= global error handler =============', ..._args)
		}
	}
})
