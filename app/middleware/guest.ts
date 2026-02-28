export default defineNuxtRouteMiddleware(async () => {
  const nuxtApp = useNuxtApp()
  const { loggedIn } = useUserSession()
  const localePath = useLocalePath()

  if (loggedIn.value) {
    log.info('auth', 'Guest redirect')
    return nuxtApp.runWithContext(() => navigateTo(localePath('index')))
  }
})
