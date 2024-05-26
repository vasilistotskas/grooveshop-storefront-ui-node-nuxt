export default defineNuxtRouteMiddleware(() => {
  const nuxtApp = useNuxtApp()
  const { loggedIn } = useUserSession()

  if (loggedIn.value) {
    console.log('====== 3 ======', loggedIn.value)
    return nuxtApp.runWithContext(() => navigateTo('/'))
  }
})
