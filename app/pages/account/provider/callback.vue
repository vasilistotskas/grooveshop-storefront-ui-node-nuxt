<script lang="ts" setup>
import { AuthChangeEvent, type AuthChangeEventType, URLs } from '~/types/all-auth'

const {
  providerToken,
} = useAllAuthAuthentication()
const authStore = useAuthStore()
const { refreshSession } = authStore

const route = useRoute()
const localePath = useLocalePath()

const {
  error: apiError,
  provider,
  access_token,
  id_token,
  client_id,
  process,
  messages,
  encrypted_token,
} = route.query

const { t } = useI18n({ useScope: 'local' })
const authInfo = useAuthInfo()

const url = ref<string>(URLs.LOGIN_URL)
const error = ref(false)
const loading = ref(true)

const title = computed(() => {
  if (loading.value) return t('title.loading')
  if (error.value) return t('title.error')
  if (messages) return messages
  return ''
})

onMounted(async () => {
  if (encrypted_token) {
    try {
      await refreshSession(String(encrypted_token))
      const authEvent = useState<AuthChangeEventType>('authEvent')
      authEvent.value = AuthChangeEvent.LOGGED_IN
    }
    catch (e) {
      error.value = true
    }
  }

  if (authInfo.isAuthenticated) {
    url.value = URLs.LOGIN_REDIRECT_URL
    await navigateTo(localePath(url.value))
    return
  }

  if (apiError) {
    error.value = true
  }

  if (provider && access_token && id_token && process) {
    try {
      loading.value = true
      await providerToken({
        provider: String(provider),
        token: {
          id_token: String(id_token),
          client_id: String(client_id),
        },
        process: process === 'login' ? 'login' : 'connect',
      })
    }
    catch {
      error.value = true
    }
    finally {
      loading.value = false
    }
  }
  else {
    loading.value = false
  }

  if (!encrypted_token && !(provider && access_token && id_token && process)) {
    error.value = true
  }
})

definePageMeta({
  layout: 'default',
  middleware: 'guest',
})
</script>

<template>
  <PageWrapper
    class="
      container-3xs flex flex-col gap-4 !p-0

      md:gap-8
    "
  >
    <PageTitle
      :text="String(title)" class="text-center capitalize"
    />
    <div
      v-if="loading" class="
        grid h-full w-full items-center justify-center justify-items-center pt-4

        md:pt-8
      " role="status"
    >
      <svg
        aria-hidden="true" class="
          inline h-24 w-24 animate-spin fill-blue-600 text-gray-200

          dark:text-gray-600
        "
        fill="none" viewBox="0 0 100 101" xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
          fill="currentColor"
        />
        <path
          d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
          fill="currentFill"
        />
      </svg>
      <span class="sr-only">{{ $t('loading') }}</span>
    </div>
    <div v-if="error" class="grid items-center justify-center gap-4">
      <p
        class="
          text-primary-950 text-center

          dark:text-primary-50
        "
      >
        {{ t('description') }}
      </p>
      <UButton
        :label="$t('continue')"
        :to="localePath(url)"
        class="justify-center"
        color="primary"
        size="xl"
        type="button"
      />
    </div>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title:
    error: Αποτυχία σύνδεσης με τον πάροχο
    loading: Σύνδεση με τον πάροχο ...
  description: Κάτι πήγε στραβά.
</i18n>
