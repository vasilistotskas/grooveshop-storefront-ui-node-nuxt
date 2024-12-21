export default defineNuxtRouteMiddleware(async () => {
  const nuxtApp = useNuxtApp()
  const { loggedIn } = useUserSession()
  const localePath = useLocalePath()

  if (loggedIn.value) {
    console.debug('Guest page only, navigating to Home page')
    return await nuxtApp.runWithContext(() => navigateTo(localePath('index')))
  }
})
