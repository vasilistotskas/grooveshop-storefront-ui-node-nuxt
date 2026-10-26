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

const { providers, signIn: loginWithProvider } = useSocialProviders()
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
        :icon="socialProviderIcon(provider.id)"
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
