import { config } from '@vue/test-utils'
import { I18n } from 'vue-i18n'

try {
	const nuxtApp = useNuxtApp()

	config.global.plugins.push({
		async install(app, ...options) {
			if (!('__VUE_I18N__' in nuxtApp.vueApp)) {
				throw new Error('i18n is not available')
			}
			const i18n = nuxtApp.vueApp.__VUE_I18N__ as I18n

			if (!i18n.global) {
				throw new Error('i18n.global is not available')
			}

			await i18n.install(app, ...options)
		}
	})
} catch {
	// For .test files we don't make i18n available
}
