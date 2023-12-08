import { NativeSlider } from '~/utils/native-slider'

export default defineNuxtPlugin((nuxtApp) => {
	nuxtApp.vueApp.use(NativeSlider)
	nuxtApp.hook('page:start', () => {
		const nativeSlider = nuxtApp.vueApp.config.globalProperties.$nativeSlider
		if (nativeSlider) {
			nativeSlider.cleanUpNativeSlider()
		}
	})
	nuxtApp.hook('page:finish', () => {
		const nativeSlider = nuxtApp.vueApp.config.globalProperties.$nativeSlider
		if (nativeSlider) {
			nativeSlider.initSlidersWithButtons()
		}
	})
	addRouteMiddleware(
		'native-slider',
		() => {
			const nativeSlider = nuxtApp.vueApp.config.globalProperties.$nativeSlider
			if (nativeSlider && process.client && document.readyState === 'complete') {
				nativeSlider.init()
			}
		},
		{ global: true }
	)

	return {
		provide: {
			nativeSlider: NativeSlider()
		}
	}
})
