<script lang="ts" setup>
/**
 * The store's usable social sign-in providers as a two-column grid of
 * labelled buttons — the board's "Google · Facebook · GitHub · Discord".
 * Renders nothing on a store without one (`useSocialProviders`).
 */
defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
})

const { providers } = useSocialProviders()
const {
  providerRedirect,
  browserProviderRedirect,
} = useAllAuthAuthentication()

const PROVIDER_ICONS: Record<string, string> = {
  google: 'i-mdi-google',
  facebook: 'i-mdi-facebook',
  github: 'i-mdi-github',
  discord: 'i-mdi-discord',
}

const loginWithProvider = async (provider: Provider) => {
  // A provider that can hand the browser a token signs in in place;
  // one that only redirects sends the browser through its own page.
  if (!provider.flows.includes('provider_token') && provider.flows.includes('provider_redirect')) {
    return await browserProviderRedirect({
      provider: String(provider.id),
      callback_url: '/account/provider/callback',
      process: 'login',
    })
  }
  return providerRedirect(provider)
}
</script>

<template>
  <ul
    v-if="providers.length"
    class="grid list-none grid-cols-2 gap-2.5 p-0"
  >
    <li
      v-for="provider in providers"
      :key="provider.id"
    >
      <UButton
        :label="provider.name"
        :icon="PROVIDER_ICONS[provider.id] ?? 'i-lucide-log-in'"
        :disabled="loading"
        :loading="loading"
        color="neutral"
        variant="outline"
        block
        type="button"
        @click="loginWithProvider(provider)"
      />
    </li>
  </ul>
</template>
