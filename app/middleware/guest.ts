export default defineNuxtRouteMiddleware(() => {
  const nuxtApp = useNuxtApp()
  const { loggedIn } = useUserSession()
  const localePath = useLocalePath()

  if (loggedIn.value) {
    console.log('========== defineNuxtRouteMiddleware guest ==========', loggedIn.value)
    return nuxtApp.runWithContext(() => navigateTo(localePath('/')))
  }
})
