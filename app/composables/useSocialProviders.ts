/**
 * The social sign-in providers a shopper can actually use on this store.
 *
 * allauth lists every provider the store has an app row for, credentials
 * or not; a provider without a client id cannot sign anyone in. The
 * sign-in and sign-up pages ask this one list both whether to draw the
 * "or" divider and which buttons to draw under it — the store-wide
 * `hasSocialAccountProviders` counts the unusable ones too, which left a
 * divider and a heading over an empty row on a store with none set up.
 */
export function useSocialProviders() {
  const authStore = useAuthStore()
  const { config } = storeToRefs(authStore)

  const providers = computed<Provider[]>(() =>
    (config.value?.socialaccount?.providers ?? []).filter(provider => provider.client_id !== ''),
  )

  return { providers, hasProviders: computed(() => providers.value.length > 0) }
}
