/**
 * Signing in with a passkey from the sign-in page: the browser's key
 * prompt, then allauth's login. Any session the visitor held is cleared
 * first, the page is remembered as `next`, and the cart is read again
 * once the shopper is in. A failure is reported through `useApiError`
 * under `title`/`fallback`. `onSettled` runs when the attempt ends, in
 * either case.
 */
export function usePasskeyLogin(options: {
  title: () => string
  fallback: () => string
  onSettled?: () => void
}) {
  const { getWebAuthnRequestOptionsForLogin, loginUsingWebAuthn } = useAllAuthAuthentication()
  const router = useRouter()
  const { notify } = useApiError()
  const { clear } = useUserSession()
  const { session } = storeToRefs(useAuthStore())
  const { refreshCart } = useCartStore()

  const loading = ref(false)

  async function login() {
    try {
      loading.value = true
      const currentPath = router.currentRoute.value.path
      const currentQuery = router.currentRoute.value.query

      if (!currentQuery.next) {
        await router.replace({ query: { next: currentPath } })
      }

      await clear()

      const requested = await getWebAuthnRequestOptionsForLogin()
      const credential = await getWebAuthnCredential(requested?.data.request_options.publicKey)
      const response = await loginUsingWebAuthn({ credential })
      session.value = response?.data
      await refreshCart()
    }
    catch (error) {
      log.error({ action: 'webauthn:login', error, requestId: requestIdOf(error) })
      notify('webauthn:login', error, { title: options.title(), fallback: options.fallback() })
    }
    finally {
      loading.value = false
      options.onSettled?.()
    }
  }

  return { loading, login }
}

/**
 * A second-factor or re-authentication challenge answered with a key:
 * `authenticate` is allauth's `mfa_authenticate` step of a sign-in,
 * `reauthenticate` the confirmation before a security change. Start it
 * from the shopper's click (`submit`). A failure sets `failed`, for the
 * page to say so, and is logged; `onDone` runs once the key was accepted.
 */
export function useWebAuthnChallenge(
  kind: 'authenticate' | 'reauthenticate',
  options: { success: () => ToastInput, onDone?: () => void },
) {
  const authentication = useAllAuthAuthentication()
  const toast = useToast()
  const { session } = storeToRefs(useAuthStore())

  const loading = ref(false)
  const failed = ref(false)

  const requestOptions = kind === 'authenticate'
    ? authentication.getWebAuthnRequestOptionsForAuthentication
    : authentication.getWebAuthnRequestOptionsForReauthentication
  const answer = kind === 'authenticate'
    ? authentication.authenticateUsingWebAuthn
    : authentication.reauthenticateUsingWebAuthn

  async function submit(): Promise<void> {
    try {
      loading.value = true
      failed.value = false

      const requested = await requestOptions()
      const credential = await getWebAuthnCredential(requested?.data.request_options.publicKey)
      const response = await answer({ credential })

      session.value = response?.data

      toast.add(options.success())
      options.onDone?.()
    }
    catch (error) {
      log.error({ action: `webauthn:${kind}`, error, requestId: requestIdOf(error) })
      failed.value = true
    }
    finally {
      loading.value = false
    }
  }

  return { loading, failed, submit }
}
