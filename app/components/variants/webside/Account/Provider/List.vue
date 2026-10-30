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
      <!-- Google's colour "G" may sit only on Google's light or dark fill
           with its own stroke (--google-signin-*), so its button is the
           guideline's icon-only one instead of a solid brand colour. -->
      <UButton
        :aria-busy="loading"
        :aria-label="provider.name"
        :disabled="loading"
        :loading="loading"
        :class="provider.id === 'google'
          ? 'bg-(--google-signin-fill) ring-(--google-signin-stroke) hover:bg-(--google-signin-fill) active:bg-(--google-signin-fill)'
          : 'capitalize'"
        :color="providerColor(provider.id)"
        size="xl"
        type="button"
        :variant="provider.id === 'google' ? 'outline' : 'solid'"
        @click="loginWithProvider(provider)"
      >
        <template #leading>
          <AccountProviderIcon
            :provider-id="provider.id"
            :class="provider.id === 'google' ? 'text-xl' : 'text-xl text-primary-50'"
          />
        </template>
      </UButton>
    </li>
  </ul>
</template>
