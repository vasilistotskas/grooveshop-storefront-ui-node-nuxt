<script lang="ts" setup>
const authStore = useAuthStore()
const { config } = storeToRefs(authStore)

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
        :label="provider.name"
        color="primary"
        size="lg"
        @click="loginWithProvider(provider.id)"
      />
    </li>
  </ul>
</template>
