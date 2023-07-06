import Toast, { PluginOptions, TYPE } from 'vue-toastification'

const ToastOptions: PluginOptions = {
	toastDefaults: {
		// ToastOptions object for each type of toast
		[TYPE.ERROR]: {
			timeout: 5000,
			closeButton: false
		},
		[TYPE.SUCCESS]: {
			timeout: 5000,
			hideProgressBar: true
		}
	}
}

export default defineNuxtPlugin((nuxtApp) => {
	nuxtApp.vueApp.use(Toast, ToastOptions)
})
