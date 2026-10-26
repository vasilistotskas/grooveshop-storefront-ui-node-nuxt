/**
 * The social sign-in providers a shopper can actually use on this store.
 *
 * allauth lists every provider the store has an app row for, credentials
 * or not; a provider without a client id cannot sign anyone in. The
 * sign-in and sign-up pages ask this one list both whether to draw the
 * "or" divider and which buttons to draw under it. Counting every listed
 * provider, usable or not, left a divider and a heading over an empty row
 * on a store with none set up.
 *
 * `signIn(provider)` starts a sign-in with one of them: a provider that
 * can hand the browser a token signs in in place; one that only redirects
 * sends the browser through its own page.
 */
export function useSocialProviders() {
  const authStore = useAuthStore()
  const { config } = storeToRefs(authStore)

  const providers = computed<Provider[]>(() => usableSocialProviders(config.value))

  const { providerRedirect, browserProviderRedirect } = useAllAuthAuthentication()

  async function signIn(provider: Provider) {
    if (!provider.flows.includes('provider_token') && provider.flows.includes('provider_redirect')) {
      return await browserProviderRedirect({
        provider: String(provider.id),
        callback_url: '/account/provider/callback',
        process: 'login',
      })
    }
    return providerRedirect(provider)
  }

  return { providers, hasProviders: computed(() => providers.value.length > 0), signIn }
}
