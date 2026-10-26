/**
 * A sign-in dialog closes itself once the session arrives.
 */
export function useCloseOnSignIn(isOpen: Ref<boolean | undefined>) {
  const { loggedIn } = useUserSession()

  watch(loggedIn, () => {
    if (loggedIn.value) {
      isOpen.value = false
    }
  })
}
