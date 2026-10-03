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
 * allauth answers a sign-out with 401 or 410 (no session left), so `$api`
 * rejects at the end of every one, after the LOGGED_OUT cascade has run:
 * that is the sign-out succeeding. Any other failure left the shopper
 * signed in — the flag is put back, so a later real session expiry still
 * says so, and the shopper is told.
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
  const toast = useToast()
  const { $i18n } = useNuxtApp()
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
      const status = (error as { statusCode?: number } | null)?.statusCode
      if (status === 401 || status === 410) return
      userInitiatedLogout.value = false
      log.error({ action: 'auth:logout', error })
      toast.add({ title: $i18n.t('account_nav.sign_out_error'), color: 'error' })
    }
    finally {
      signingOut.value = false
    }
  }

  return { signOut, signingOut }
}
