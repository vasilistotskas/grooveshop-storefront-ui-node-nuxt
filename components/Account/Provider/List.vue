<script lang="ts" setup>
import type { PropType } from 'vue'

const props = defineProps({
  callbackUrl: {
    type: String,
    required: true,
  },
  process: {
    type: String as PropType<'login' | 'connect'>,
    required: true,
  },
})

const { callbackUrl, process } = toRefs(props)

const authStore = useAuthStore()
const { config } = storeToRefs(authStore)

const {
  providerRedirect,
} = useAllAuthAuthentication()

const providers = computed(() => {
  return config.value?.data.socialaccount?.providers
})
</script>

<template>
  <ul v-if="providers" class="grid gap-4">
    <li v-for="provider in providers" :key="provider.id">
      <UButton
        :label="provider.name"
        color="primary"
        size="lg"
        @click="providerRedirect({
          provider: provider.id,
          callback_url: callbackUrl,
          process,
        })"
      />
    </li>
  </ul>
</template>
