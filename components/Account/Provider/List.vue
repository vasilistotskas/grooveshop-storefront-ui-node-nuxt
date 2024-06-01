<script lang="ts" setup>
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
} = useAllAuthAuthentication()

const providers = computed(() => {
  return config.value?.data.socialaccount?.providers
})

const loginWithProvider = (provider: string) => {
  providerRedirect(provider)
}
</script>

<template>
  <ul v-if="providers" class="grid gap-4">
    <li v-for="provider in providers" :key="provider.id">
      <UButton
        :aria-busy="loading"
        :aria-label="provider.name"
        :disabled="loading"
        :loading="loading"
        class="capitalize"
        color="red"
        size="xl"
        type="button"
        variant="solid"
        @click="loginWithProvider(provider.id)"
      >
        <template #leading>
          <IconMdi:google
            v-if="provider.id === 'google'" class="text-xl text-primary-50"
          />
        </template>
      </UButton>
    </li>
  </ul>
</template>
