import { GlobalEvents } from '~/events'

export default defineNuxtPlugin((nuxtApp) => {
  // called right before setting a new locale
  nuxtApp.hook(
    'i18n:beforeLocaleSwitch',
    ({ oldLocale, newLocale, initialSetup, context }) => {
      const bus = useEventBus<string>(GlobalEvents.ON_BEFORE_LANGUAGE_SWITCH)
      bus.emit(GlobalEvents.ON_BEFORE_LANGUAGE_SWITCH, {
        oldLocale,
        newLocale,
        initialSetup,
        context,
      })
    },
  )
  // called right after a new locale has been set
  nuxtApp.hook('i18n:localeSwitched', ({ oldLocale, newLocale }) => {
    const bus = useEventBus<string>(GlobalEvents.ON_LANGUAGE_UPDATED)
    bus.emit(GlobalEvents.ON_LANGUAGE_UPDATED, {
      oldLocale,
      newLocale,
    })
  })
})
