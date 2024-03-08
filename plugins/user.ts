export default defineNuxtPlugin(async () => {
  const { user, loggedIn } = useUserSession()
  if (!loggedIn.value) {
    return
  }
  const userStore = useUserStore()
  const { setAccountState } = userStore
  await useFetch(`/api/user/account/${user.value?.id}/details`, {
    method: 'GET',
    query: {
      expand: 'true',
    },
    onResponse({ response }) {
      setAccountState(response._data)
    },
  })
  await useFetch('/api/auth/mfa/totp/active', {
    method: 'GET',
  })
})
