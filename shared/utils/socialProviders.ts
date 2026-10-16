/**
 * The social sign-in providers a shopper can actually use on the store.
 *
 * allauth lists every provider the store allows and has an app row for,
 * credentials or not; a provider without a client id cannot sign anyone
 * in. One rule for the sign-in buttons (`useSocialProviders`) and the
 * OAuth routes (`requireSocialProvider`), so a provider has a route
 * exactly when it has a button.
 */
export function usableSocialProviders(
  config: { socialaccount?: { providers: Provider[] } } | null | undefined,
): Provider[] {
  return (config?.socialaccount?.providers ?? []).filter(provider => provider.client_id !== '')
}
