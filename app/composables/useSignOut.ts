/**
 * Signing out, wherever the shopper does it — the header's account menu,
 * the account area's sidebar and its overview.
 *
 * Leaves a protected page BEFORE the session goes, or the route guard
 * races the logout and bounces through the sign-in page. Marks the
 * logout as the shopper's own synchronously, before the request, so a
 * 410 from a background call racing it still reads as explicit and the
 * "session expired" toast stays quiet.
 *
 * Nothing else: the `auth:change` LOGGED_OUT cascade clears the auth,
 * account and notification state (auth plugin) and the cart
 * (`setup.ts`'s loggedIn watcher), and `session.delete.ts` clears the
 * server's cart session in its `finally`. Refreshing the cart here as
 * well raced that cleanup and created a phantom anonymous cart.
 */
export function useSignOut() {
  const route = useRoute()
  const { $routeBaseName } = useNuxtApp()
  const localePath = useLocalePath()
  const { deleteSession } = useAllAuthAuthentication()
  const userInitiatedLogout = useState<boolean>('auth:userInitiatedLogout', () => false)

  const signingOut = ref(false)

  async function signOut() {
    const name = $routeBaseName(route)
    if (typeof name === 'string' && isRouteProtected(name)) {
      await navigateTo(localePath('index'))
    }

    userInitiatedLogout.value = true
    signingOut.value = true
    try {
      await deleteSession({ explicit: true })
    }
    catch (error) {
      log.error({ action: 'auth:logout', error })
    }
    finally {
      signingOut.value = false
    }
  }

  return { signOut, signingOut }
}
