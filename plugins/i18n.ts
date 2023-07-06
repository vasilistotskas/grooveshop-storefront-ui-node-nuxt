import { GlobalEvents } from '~/events/global'

export default defineNuxtPlugin((nuxtApp) => {
	// called right before setting a new locale
	nuxtApp.hook(
		// @ts-ignore
		'i18n:beforeLocaleSwitch',
		// @ts-ignore
		({ oldLocale, newLocale, initialSetup, context }) => {
			const bus = useEventBus<string>(GlobalEvents.ON_BEFORE_LANGUAGE_SWITCH)
			bus.emit(GlobalEvents.ON_BEFORE_LANGUAGE_SWITCH, {
				oldLocale,
				newLocale,
				initialSetup,
				context
			})
		}
	)
	// called right after a new locale has been set
	// @ts-ignore
	nuxtApp.hook('i18n:localeSwitched', ({ oldLocale, newLocale }) => {
		const bus = useEventBus<string>(GlobalEvents.ON_LANGUAGE_SWITCHED)
		bus.emit(GlobalEvents.ON_LANGUAGE_SWITCHED, {
			oldLocale,
			newLocale
		})
	})
})
