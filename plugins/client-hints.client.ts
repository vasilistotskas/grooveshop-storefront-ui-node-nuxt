import {
  HTTPClientHints,
  type SSRClientHints,
  ssrClientHintsConfiguration,
} from '~/types/client-hints'

export default defineNuxtPlugin({
  name: 'client-hints:client:plugin',
  order: -25,
  parallel: true,
  setup(nuxtApp) {
    const state = useSSRClientHints()

    const { firstRequest } = state.value

    const { viewportSize, prefersColorScheme, prefersColorSchemeOptions } =
      ssrClientHintsConfiguration

    if (firstRequest) {
      if (prefersColorScheme) {
        const themeCookie = state.value.colorSchemeCookie
        // write the cookie and refresh the page if configured
        if (prefersColorSchemeOptions && themeCookie) {
          const prefersDark = window.matchMedia(
            '(prefers-color-scheme: dark)',
          ).matches
          const cookieName = prefersColorSchemeOptions.cookieName
          const parseCookieName = `${cookieName}=`
          const cookieEntry = `${parseCookieName}${state.value.colorSchemeFromCookie ?? prefersColorSchemeOptions.defaultTheme};`
          const newThemeName = prefersDark
            ? prefersColorSchemeOptions.darkThemeName
            : prefersColorSchemeOptions.lightThemeName
          document.cookie = themeCookie.replace(
            cookieEntry,
            `${cookieName}=${newThemeName};`,
          )
        }
      }
    }

    if (viewportSize || (prefersColorScheme && prefersColorSchemeOptions)) {
      // update theme logic
      if (prefersColorScheme && prefersColorSchemeOptions) {
        const themeCookie = state.value.colorSchemeCookie
        const themeColor = state.value.colorSchemeFromCookie
        if (themeCookie) {
          nuxtApp.hook('app:beforeMount', () => {
            const cookieName = prefersColorSchemeOptions.cookieName
            const parseCookieName = `${cookieName}=`
            const cookieEntry = `${parseCookieName}${state.value.colorSchemeFromCookie ?? prefersColorSchemeOptions.defaultTheme};`

            const color = useNuxtApp().$colorMode
            if (themeColor) {
              color.value = themeColor
              color.preference = themeColor
            }

            watch(
              color,
              (newThemeName) => {
                document.cookie = themeCookie.replace(
                  cookieEntry,
                  `${cookieName}=${newThemeName.value};`,
                )
              },
              { immediate: false },
            )
          })
        }
      }
    }

    return {
      provide: reactive({
        ssrClientHints: state,
      }),
    }
  },
})

function defaultClientValues() {
  return <SSRClientHints>{
    firstRequest: false,
    prefersColorSchemeAvailable: false,
    prefersReducedMotionAvailable: false,
    viewportHeightAvailable: true,
    viewportWidthAvailable: true,
    viewportHeight: window.innerHeight,
    viewportWidth: window.innerWidth,
  }
}

function useSSRClientHints() {
  const state = useState<SSRClientHints>(HTTPClientHints)
  if (state.value) return state

  const initial = ref(defaultClientValues())

  if (
    !ssrClientHintsConfiguration.prefersColorScheme ||
    !ssrClientHintsConfiguration.prefersColorSchemeOptions
  )
    return initial

  const { baseUrl, cookieName, defaultTheme } =
    ssrClientHintsConfiguration.prefersColorSchemeOptions
  const cookieNamePrefix = `${cookieName}=`
  initial.value.colorSchemeFromCookie =
    document.cookie
      ?.split(';')
      ?.find((c) => c.trim().startsWith(cookieNamePrefix))
      ?.split('=')[1] ?? defaultTheme
  const date = new Date()
  const expires = new Date(date.setDate(date.getDate() + 365))
  initial.value.colorSchemeCookie = `${cookieName}=${initial.value.colorSchemeFromCookie}; Path=${baseUrl}; Expires=${expires.toUTCString()}; SameSite=Lax`

  return initial
}
