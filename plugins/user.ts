export default defineNuxtPlugin(async () => {
  const { loggedIn } = useUserSession()
  if (!loggedIn.value) {
    return
  }
  await useFetch('/api/auth/mfa/totp/active', {
    method: 'GET',
  })
})
