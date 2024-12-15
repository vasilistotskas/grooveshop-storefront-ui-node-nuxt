export default defineNuxtRouteMiddleware(() => {
  const nuxtApp = useNuxtApp()
  const { loggedIn } = useUserSession()
  const localePath = useLocalePath()

  if (loggedIn.value) {
    console.debug('Guest page only, navigating to Home page')
    return nuxtApp.runWithContext(() => navigateTo(localePath('index')))
  }
})
