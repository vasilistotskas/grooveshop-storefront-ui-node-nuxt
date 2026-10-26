/** How linking a social account to a signed-in shopper ended. */
export type ConnectOutcome = 'done' | 'taken' | 'cancelled' | 'failed'

/**
 * Where the storefront's own OAuth routes land, `?provider=&process=`
 * (or `?provider=&error=` when the provider refused). The provider's
 * tokens sit in the server session, never in the URL: they are read once
 * from `/api/auth/oauth-params` and sent to allauth's provider-token
 * endpoint.
 *
 * Signing in: navigation afterwards belongs to the auth plugin's
 * `auth:change` chain, and the page only shows a failure (`error`). A
 * first-time shopper's pending `provider_signup` is the "finish signing
 * up" hand-off, not a failure.
 *
 * Linking an account (a signed-in shopper, `connecting`): allauth answers
 * a link with the same session whether it linked the account or refused it
 * as another shopper's, and the auth chain sees no change to act on, so
 * the page reads the shopper's linked accounts back, says which it was
 * (`outcome`) and returns them to `returnRoute` either way.
 */
export function useProviderCallback(options: {
  returnRoute: Parameters<ReturnType<typeof useLocalePath>>[0]
  outcome: (outcome: ConnectOutcome) => string
}) {
  const { providerToken } = useAllAuthAuthentication()
  const { connectedThirdPartyProviderAccounts } = useAllAuthAccount()
  const { loggedIn } = useUserSession()
  const toast = useToast()
  const route = useRoute()
  const localePath = useLocalePath()

  const { error: apiError, provider, process } = route.query
  const connecting = loggedIn.value

  const error = ref(false)
  const loading = ref(true)

  /**
   * Whether the account is linked now. The Connect button is offered only
   * for a provider with no linked account, so one being there means this
   * link made it.
   */
  async function isLinked(providerId: string) {
    const accounts = await connectedThirdPartyProviderAccounts()
    return accounts?.data.some(account => account.provider.id === providerId) ?? false
  }

  async function returnToAccount(outcome: ConnectOutcome) {
    toast.add({ title: options.outcome(outcome), color: outcome === 'done' ? 'success' : 'error' })
    await navigateTo(localePath(options.returnRoute), { replace: true })
  }

  onMounted(async () => {
    if (apiError || !(provider && process)) {
      if (connecting) return returnToAccount(apiError ? 'cancelled' : 'failed')
      error.value = true
      loading.value = false
      return
    }

    try {
      const oauthParams = await $api('/api/auth/oauth-params')
      const token: ProviderToken = { client_id: String(oauthParams.client_id) }
      if (oauthParams.id_token) {
        Object.assign(token, { id_token: String(oauthParams.id_token) })
      }
      if (oauthParams.access_token) {
        Object.assign(token, { access_token: String(oauthParams.access_token) })
      }
      await providerToken({
        provider: String(oauthParams.provider),
        token,
        process: oauthParams.process === 'login' ? 'login' : 'connect',
      })
      if (connecting) return await returnToAccount(await isLinked(String(oauthParams.provider)) ? 'done' : 'taken')
    }
    catch (err) {
      if (connecting) {
        log.error({ action: 'provider:connect', error: err })
        return returnToAccount('failed')
      }
      // A first-time OAuth user gets a 401 with `provider_signup` pending —
      // the expected "complete your signup" hand-off, not a failure. The
      // auth:change hook usually navigates there first; this guard makes the
      // hand-off explicit and keeps the error page for genuine errors only.
      if (await tryAdvanceToPendingFlow(err, { fromPath: route.path })) return
      error.value = true
    }
    finally {
      loading.value = false
    }
  })

  return { connecting, error, loading }
}
