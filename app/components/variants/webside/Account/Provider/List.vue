<script lang="ts" setup>
defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
})

const { providers: availableProviders, signIn: loginWithProvider } = useSocialProviders()

const providerColor = (provider: string) => {
  switch (provider) {
    case 'google':
      return 'error'
    case 'facebook':
      return 'info'
    case 'github':
      return 'neutral'
    case 'discord':
      return 'secondary'
    default:
      return 'neutral'
  }
}
</script>

<template>
  <ul
    v-if="availableProviders"
    class="flex gap-4"
  >
    <li
      v-for="provider in availableProviders"
      :key="provider.id"
    >
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
          <LazyUIcon
            v-if="provider.id === 'google'"
            name="i-mdi-google"
            class="text-xl text-primary-50"
          />
          <LazyUIcon
            v-if="provider.id === 'facebook'"
            name="i-mdi-facebook"
            class="text-xl text-primary-50"
          />
          <LazyUIcon
            v-if="provider.id === 'github'"
            name="i-mdi-github"
            class="text-xl text-primary-50"
          />
          <LazyUIcon
            v-if="provider.id === 'discord'"
            name="i-mdi-discord"
            class="text-xl text-primary-50"
          />
        </template>
      </UButton>
    </li>
  </ul>
</template>
