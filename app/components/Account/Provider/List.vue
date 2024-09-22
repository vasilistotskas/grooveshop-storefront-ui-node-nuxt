<script lang="ts" setup>
import type { Provider } from '~/types/all-auth'

const authStore = useAuthStore()
const { config } = storeToRefs(authStore)

defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
})

const {
  providerRedirect,
  browserProviderRedirect,
} = useAllAuthAuthentication()

const providers = computed(() => {
  return config.value?.socialaccount?.providers
})

const availableProviders = computed(() => {
  return providers.value?.filter((provider: Provider) => {
    return provider.client_id !== ''
  })
})

const loginWithProvider = async (provider: Provider) => {
  let webOnly = false

  if (provider.flows.includes('provider_token')) {
    webOnly = false
  }
  else if (provider.flows.includes('provider_redirect')) {
    webOnly = true
  }

  if (webOnly) {
    return await browserProviderRedirect({
      provider: String(provider.id),
      callback_url: '/account/provider/callback',
      process: 'login',
    })
  }
  else {
    return providerRedirect(provider)
  }
}

const providerColor = (provider: string) => {
  switch (provider) {
    case 'google':
      return 'red'
    case 'facebook':
      return 'blue'
    case 'github':
      return 'full-black'
    case 'discord':
      return 'purple'
    default:
      return 'primary'
  }
}
</script>

<template>
  <ul v-if="availableProviders" class="flex gap-4">
    <li v-for="provider in availableProviders" :key="provider.id">
      <UButton
        :aria-busy="loading"
        :aria-label="provider.name"
        :disabled="loading"
        :loading="loading"
        class="capitalize"
        :color="providerColor(provider.id)"
        size="xl"
        type="button"
        variant="solid"
        @click="loginWithProvider(provider)"
      >
        <template #leading>
          <UIcon
            v-if="provider.id === 'google'" name="i-mdi-google" class="
              text-xl text-primary-50
            "
          />
          <UIcon
            v-if="provider.id === 'facebook'" name="i-mdi-facebook" class="
              text-xl text-primary-50
            "
          />
          <UIcon
            v-if="provider.id === 'github'" name="i-mdi-github" class="
              text-xl text-primary-50
            "
          />
          <UIcon
            v-if="provider.id === 'discord'" name="i-mdi-discord" class="
              text-xl text-primary-50
            "
          />
        </template>
      </UButton>
    </li>
  </ul>
</template>
