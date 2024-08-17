<script lang="ts" setup>
import {
  parseRequestOptionsFromJSON,
  get,
} from '@github/webauthn-json/browser-ponyfill'

const emit = defineEmits(['getWebAuthnRequestOptionsForLogin', 'loginUsingWebAuthn'])

const { getWebAuthnRequestOptionsForLogin, loginUsingWebAuthn } = useAllAuthAuthentication()
const { t } = useI18n()
const toast = useToast()
const { clear } = useUserSession()
const authStore = useAuthStore()
const { session } = storeToRefs(authStore)
const cartStore = useCartStore()
const { refreshCart } = cartStore

const loading = ref(false)

async function onSubmit() {
  try {
    loading.value = true
    await clear()
    const optResp = await getWebAuthnRequestOptionsForLogin()
    const jsonOptions = optResp?.data.request_options
    if (!jsonOptions) {
      throw new Error('No creation options')
    }
    const options = parseRequestOptionsFromJSON(jsonOptions)
    const credential = await get(options)
    session.value = await loginUsingWebAuthn({
      credential,
    })
    await performPostLoginActions()
  }
  catch (error) {
    if (isAllAuthClientError(error)) {
      const errors = 'errors' in error.data.data ? error.data.data.errors : []
      errors.forEach((error) => {
        toast.add({
          title: error.message,
          color: 'red',
        })
      })
      return
    }
    toast.add({
      title: t('common.error.default'),
      color: 'red',
    })
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
    ? t('common.webauthn.login')
    : t('common.loading')
})
</script>

<template>
  <UButton
    :aria-busy="loading"
    :disabled="submitButtonDisabled"
    :label="
      submitButtonLabel"
    :loading="loading"
    block
    color="primary"
    size="md"
    type="submit"
    variant="soft"
    icon="i-heroicons-solid:lock-closed"
    @click="onSubmit"
  />
</template>
