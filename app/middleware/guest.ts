export default defineNuxtRouteMiddleware(() => {
  const nuxtApp = useNuxtApp()
  const { loggedIn } = useUserSession()

  if (loggedIn.value) {
    return nuxtApp.runWithContext(() => navigateTo('/'))
  }
})
