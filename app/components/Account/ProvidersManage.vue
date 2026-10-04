<script lang="ts" setup>
/**
 * The social accounts linked to the shopper's, as the boards draw them: a
 * card per account — the provider, the account it is, "Disconnect" — and
 * one per provider the store offers that is not linked yet, with
 * "Connect". Renders nothing when there is neither.
 *
 * A provider the store has since stopped offering keeps its linked
 * accounts' cards, so the shopper can still unlink them. Connecting runs
 * the storefront's own OAuth route with `process=connect`, and the
 * provider callback page brings the shopper back here; providers it
 * cannot link are not offered (`canConnectSocialProvider`).
 */
const { connectedThirdPartyProviderAccounts, disconnectThirdPartyProviderAccount } = useAllAuthAccount()
const { providerRedirect } = useAllAuthAuthentication()
const { providers } = useSocialProviders()
const toast = useToast()
const { t } = useI18n()

const { data: linked } = await useAsyncData(
  'providerAccounts',
  () => connectedThirdPartyProviderAccounts(),
)

type Card
  = | { kind: 'linked', key: string, providerId: string, name: string, account: ProviderAccount }
    | { kind: 'connect', key: string, providerId: string, name: string, provider: Provider }

const cards = computed<Card[]>(() => {
  const accounts = linked.value?.data ?? []
  const linkedCard = (account: ProviderAccount): Card => ({
    kind: 'linked',
    key: `${account.provider.id}:${account.uid}`,
    providerId: account.provider.id,
    name: account.provider.name,
    account,
  })
  const offered = providers.value.flatMap((provider): Card[] => {
    const own = accounts.filter(account => account.provider.id === provider.id)
    if (own.length) return own.map(linkedCard)
    return canConnectSocialProvider(provider)
      ? [{ kind: 'connect', key: provider.id, providerId: provider.id, name: provider.name, provider }]
      : []
  })
  const offeredIds = new Set(providers.value.map(provider => provider.id))
  const withdrawn = accounts.filter(account => !offeredIds.has(account.provider.id)).map(linkedCard)
  return [...offered, ...withdrawn]
})

const busy = ref<string | null>(null)

/** One change at a time: every card's button is disabled while one is in flight. */
async function disconnect(account: ProviderAccount) {
  busy.value = `${account.provider.id}:${account.uid}`
  try {
    linked.value = await disconnectThirdPartyProviderAccount({
      provider: account.provider.id,
      account: account.uid,
    })
    toast.add({ title: t('disconnected', { provider: account.provider.name }), color: 'success' })
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
</script>

<template>
  <AccountSection
    v-if="cards.length"
    :title="t('title')"
  >
    <ul class="grid gap-3 sm:grid-cols-2">
      <li
        v-for="card in cards"
        :key="card.key"
        class="flex items-center gap-3 rounded-[1rem] p-3 ring ring-default"
      >
        <span class="flex size-9 shrink-0 items-center justify-center rounded-[0.625rem] bg-elevated">
          <UIcon
            :name="socialProviderIcon(card.providerId)"
            class="size-4 text-highlighted"
          />
        </span>
        <span class="flex min-w-0 flex-1 flex-col">
          <span class="text-sm font-semibold text-highlighted">{{ card.name }}</span>
          <span class="truncate text-xs text-toned">
            {{ card.kind === 'linked' ? card.account.display : t('not_connected') }}
          </span>
        </span>
        <UButton
          v-if="card.kind === 'linked'"
          :label="t('disconnect')"
          :aria-label="t('disconnect_named', { provider: card.name, account: card.account.display })"
          :loading="busy === card.key"
          :disabled="busy !== null"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="() => disconnect(card.account)"
        />
        <UButton
          v-else
          :label="t('connect')"
          :aria-label="t('connect_named', { provider: card.name })"
          :loading="busy === card.key"
          :disabled="busy !== null"
          color="neutral"
          variant="outline"
          size="sm"
          @click="() => connect(card.provider)"
        />
      </li>
    </ul>
  </AccountSection>
</template>

<i18n lang="yaml">
el:
  title: Συνδεδεμένοι λογαριασμοί
  not_connected: Δεν έχει συνδεθεί
  connect: Σύνδεση
  connect_named: Σύνδεση λογαριασμού {provider}
  disconnect: Αποσύνδεση
  disconnect_named: Αποσύνδεση του λογαριασμού {provider} {account}
  disconnected: Ο λογαριασμός {provider} αποσυνδέθηκε
en:
  title: Connected accounts
  not_connected: Not connected
  connect: Connect
  connect_named: Connect a {provider} account
  disconnect: Disconnect
  disconnect_named: Disconnect the {provider} account {account}
  disconnected: Your {provider} account was disconnected
</i18n>
