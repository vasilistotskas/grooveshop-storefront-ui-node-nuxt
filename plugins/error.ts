export default defineNuxtPlugin((nuxtApp) => {
	nuxtApp.hook('vue:error', (..._args) => {
		// eslint-disable-next-line no-console
		console.log('============= vue:error =============')
		// if (process.client) {
		//   console.log(..._args)
		// }
	})
	nuxtApp.hook('app:error', (..._args) => {
		// eslint-disable-next-line no-console
		console.log('============= app:error =============')
		// if (process.client) {
		//   console.log(..._args)
		// }
	})
	nuxtApp.vueApp.config.errorHandler = (..._args) => {
		// eslint-disable-next-line no-console
		console.log('============= global error handler =============')
		// if (process.client) {
		//   console.log(..._args)
		// }
	}
})
