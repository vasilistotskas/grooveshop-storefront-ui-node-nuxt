export default defineNuxtRouteMiddleware(() => {
  const { user } = useUserSession()
  if (user.value) {
    setIdentity({ userId: String(user.value.id) })
  }
  else {
    clearIdentity()
  }
})
