<script lang="ts" setup>
const emit = defineEmits(['getWebAuthnRequestOptionsForLogin', 'loginUsingWebAuthn'])

const { $i18n } = useNuxtApp()
const { getWebAuthnRequestOptionsForLogin, loginUsingWebAuthn } = useAllAuthAuthentication()
const { t } = useI18n()
const router = useRouter()
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
    const currentPath = router.currentRoute.value.path
    const currentQuery = router.currentRoute.value.query

    if (!currentQuery.next) {
      await router.replace({ query: { next: currentPath } })
    }

    await clear()

    const optResp = await getWebAuthnRequestOptionsForLogin()
    const jsonOptions = optResp?.data.request_options.publicKey
    if (!jsonOptions) {
      throw new Error('No creation options')
    }

    const publicKey = PublicKeyCredential.parseRequestOptionsFromJSON(jsonOptions)
    const credential = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential
    const response = await loginUsingWebAuthn({
      credential: credential.toJSON(),
    })
    session.value = response?.data
    await performPostLoginActions()
  }
  catch {
    console.error('Login failed')
    toast.add({
      title: t('webauthn.error.title'),
      description: t('webauthn.error.description'),
      color: 'error',
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
    ? t('webauthn.login')
    : $i18n.t('loading')
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

<i18n lang="yaml">
el:
  webauthn:
    login: Σύνδεση με κλειδί ασφαλείας
    error:
      title: Η σύνδεση απέτυχε
      description: Υπήρξε πρόβλημα με την αυθεντικοποίηση μέσω WebAuthn. Παρακαλώ προσπάθησε ξανά.
</i18n>
