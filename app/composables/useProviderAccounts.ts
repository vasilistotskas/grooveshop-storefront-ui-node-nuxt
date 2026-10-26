/** A social account that is linked, or a provider the shopper can still connect. */
export type ProviderCard
  = | { kind: 'linked', key: string, providerId: string, name: string, account: ProviderAccount }
    | { kind: 'connect', key: string, providerId: string, name: string, provider: Provider }

/**
 * The social accounts linked to the shopper's, and the providers the store
 * offers that are not linked yet. A provider the store has since stopped
 * offering keeps its linked accounts, so the shopper can still unlink them.
 * Connecting runs the storefront's own OAuth route with `process=connect`
 * and the provider callback page brings the shopper back; providers it
 * cannot link are not offered (`canConnectSocialProvider`).
 *
 * Disconnecting answers with the shopper's remaining accounts (allauth's
 * `ManageProvidersView.delete`, `headless/socialaccount/views.py`), which
 * replace the list. One change at a time: `busy` names the account or
 * provider in flight. Awaited in `<script setup>`.
 */
export async function useProviderAccounts(options: {
  disconnected: (account: ProviderAccount) => ToastInput
}) {
  const { connectedThirdPartyProviderAccounts, disconnectThirdPartyProviderAccount } = useAllAuthAccount()
  const { providerRedirect } = useAllAuthAuthentication()
  const { providers } = useSocialProviders()
  const toast = useToast()

  const { data: linked } = await useAsyncData(
    'providerAccounts',
    () => connectedThirdPartyProviderAccounts(),
  )

  const accounts = computed(() => linked.value?.data ?? [])

  const cards = computed<ProviderCard[]>(() => {
    const linkedCard = (account: ProviderAccount): ProviderCard => ({
      kind: 'linked',
      key: `${account.provider.id}:${account.uid}`,
      providerId: account.provider.id,
      name: account.provider.name,
      account,
    })
    const offered = providers.value.flatMap((provider): ProviderCard[] => {
      const own = accounts.value.filter(account => account.provider.id === provider.id)
      if (own.length) return own.map(linkedCard)
      return canConnectSocialProvider(provider)
        ? [{ kind: 'connect', key: provider.id, providerId: provider.id, name: provider.name, provider }]
        : []
    })
    const offeredIds = new Set(providers.value.map(provider => provider.id))
    const withdrawn = accounts.value.filter(account => !offeredIds.has(account.provider.id)).map(linkedCard)
    return [...offered, ...withdrawn]
  })

  const busy = ref<string | null>(null)

  async function disconnect(account: ProviderAccount) {
    busy.value = `${account.provider.id}:${account.uid}`
    try {
      linked.value = await disconnectThirdPartyProviderAccount({
        provider: account.provider.id,
        account: account.uid,
      })
      toast.add(options.disconnected(account))
    }
    catch (error) {
      handleAllAuthClientError(error)
    }
    finally {
      busy.value = null
    }
  }

  function connect(provider: Provider) {
    busy.value = provider.id
    providerRedirect(provider, 'connect')
  }

  return { accounts, cards, busy, disconnect, connect }
}
