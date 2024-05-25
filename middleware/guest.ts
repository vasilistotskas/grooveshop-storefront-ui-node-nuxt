export default defineNuxtRouteMiddleware(() => {
  const nuxtApp = useNuxtApp()
  const { loggedIn } = useUserSession()

  if (loggedIn.value) {
    console.log('====== 3 ======')
    return nuxtApp.runWithContext(() => navigateTo('/'))
  }
})
