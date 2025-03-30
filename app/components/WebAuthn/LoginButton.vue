<script lang="ts" setup>
import {
  parseRequestOptionsFromJSON,
  get,
} from '@github/webauthn-json/browser-ponyfill'
import type { CredentialRequestOptionsJSON } from '@github/webauthn-json'

const emit = defineEmits(['getWebAuthnRequestOptionsForLogin', 'loginUsingWebAuthn'])

const { getWebAuthnRequestOptionsForLogin, loginUsingWebAuthn } = useAllAuthAuthentication()
const { t } = useI18n()
const router = useRouter()
const { clear } = useUserSession()
const authStore = useAuthStore()
const { session } = storeToRefs(authStore)
const cartStore = useCartStore()
const { refreshCart } = cartStore

const loading = ref(false)

async function onSubmit() {
  try {
    loading.value = true
    const currentPath = router.currentRoute.value.path
    const currentQuery = router.currentRoute.value.query

    if (!currentQuery.next) {
      await router.replace({ query: { next: currentPath } })
    }

    await clear()

    const optResp = await getWebAuthnRequestOptionsForLogin()
    const jsonOptions = optResp?.data.request_options as CredentialRequestOptionsJSON
    if (!jsonOptions) {
      throw new Error('No creation options')
    }

    const options = parseRequestOptionsFromJSON(jsonOptions)
    const credential = await get(options)
    const response = await loginUsingWebAuthn({
      credential,
    })
    session.value = response?.data
    await performPostLoginActions()
  }
  catch {
    console.error('Login failed')
  }
  finally {
    await finalizeLogin()
  }
}

async function performPostLoginActions() {
  await refreshCart()
}

async function finalizeLogin() {
  loading.value = false
  emit('getWebAuthnRequestOptionsForLogin')
  emit('loginUsingWebAuthn')
}

const submitButtonDisabled = computed(() => {
  return loading.value
})

const submitButtonLabel = computed(() => {
  return !loading.value
    ? t('webauthn.login')
    : t('loading')
})
</script>

<template>
  <UButton
    icon="i-heroicons-solid:lock-closed"
    :aria-busy="loading"
    :disabled="submitButtonDisabled"
    :label="
      submitButtonLabel"
    :loading="loading"
    block
    size="lg"
    type="submit"
    variant="solid"
    color="secondary"
    @click="onSubmit"
  />
</template>
